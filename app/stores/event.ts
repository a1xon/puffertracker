import { defineStore } from 'pinia'
import type { Database } from '~/types/supabase'

export type GuestStatus = 'active' | 'paused' | 'ko'
export type Gender = 'm' | 'f'

export interface Guest {
  id: string
  name: string
  gender: Gender
  seat_order: number
  status: GuestStatus
  pauseEndTime?: number
  count: number
  mass: number 
  velocity: number
  lastPufferTime: number
  x: number 
  y: number 
}

export interface Log {
  id: number
  timestamp: number
  guestId: string
}

export const useEventStore = defineStore('event', {
  state: () => ({
    guests: [] as Guest[],
    logs: [] as Log[],
    startTime: Date.now(),
    unitWeight: 90, 
    unitKcal: 220, 
    isFrozen: false,
    lastRoastPhrases: [] as string[],
    initializing: false,
    initialized: false,
    connectionStatus: 'DISCONNECTED' as 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'
  }),

  getters: {
    totalCount: (state) => state.guests.reduce((sum, g) => sum + g.count, 0),
    totalMass: (state) => state.guests.reduce((sum, g) => sum + g.mass, 0),
    totalKcal: (state) => state.guests.reduce((sum, g) => sum + g.count * state.unitKcal, 0),
    
    leaderboard: (state) => {
      return [...state.guests].sort((a, b) => b.count - a.count)
    },

    recommendationQueue: (state) => {
      const now = Date.now()
      const candidates = state.guests.filter(g => 
        g.status === 'active' && 
        !state.isFrozen && 
        g.name.toLowerCase() !== 'piet'
      )
      
      if (candidates.length === 0) return []

      const scored = candidates.map(g => {
        let score = 0
        const secondsSinceLast = (now - g.lastPufferTime) / 1000
        score += secondsSinceLast
        if (g.gender === 'f') score *= 1.2
        if (g.count < 3) score += 500 
        if (secondsSinceLast < 120) score -= 1000
        return { ...g, score }
      })

      return scored.sort((a, b) => b.score - a.score).slice(0, 6)
    }
  },

  actions: {
    async init() {
      if (this.initialized || this.initializing) return
      
      try {
        this.initializing = true
        const supabase = useSupabaseClient<Database>()
        
        const { data: config } = await supabase.from('event_config').select('*').single()
        if (config) {
          this.startTime = config.event_start ? new Date(config.event_start).getTime() : Date.now()
          this.isFrozen = config.is_frozen || false
          this.lastRoastPhrases = config.last_roast_phrases || []
        }

        const { data: participants } = await supabase.from('extended_stats').select('*').order('seat_order', { ascending: true })
        if (participants) {
          this.handleFullSync(participants)
        }

        const { data: logs } = await supabase.from('puffer_logs').select('*').order('eaten_at', { ascending: true })
        if (logs) {
          this.logs = logs.map(l => ({
            id: l.id,
            timestamp: l.eaten_at ? new Date(l.eaten_at).getTime() : Date.now(),
            guestId: l.participant_id || ''
          }))
          this.logs.forEach(log => {
            const guest = this.guests.find(g => g.id === log.guestId)
            if (guest && log.timestamp > guest.lastPufferTime) guest.lastPufferTime = log.timestamp
          })
        }

        this.connectionStatus = 'CONNECTING'
        const channel = supabase.channel('public:any')
        channel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'puffer_logs' }, payload => this.handleNewLog(payload.new))
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'puffer_logs' }, payload => this.handleRemoveLog((payload.old as any).id))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, payload => {
              if (payload.eventType === 'INSERT') this.handleNewParticipant(payload.new)
              else if (payload.eventType === 'UPDATE') this.handleParticipantUpdate(payload.new)
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_config' }, payload => {
              const updated = payload.new as any
              this.isFrozen = updated.is_frozen
              if (updated.last_roast_phrases) this.lastRoastPhrases = updated.last_roast_phrases
          })
          .subscribe((status, err) => {
              console.log('Supabase channel status:', status, err)
              if (status === 'SUBSCRIBED') this.connectionStatus = 'CONNECTED'
              else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.connectionStatus = 'DISCONNECTED'
          })

        this.initialized = true
      } finally {
        this.initializing = false
      }
    },

    handleFullSync(participants: any[]) {
        this.guests = participants.map((p, index) => {
            const status = p.is_knocked_out ? 'ko' : (p.paused_until && new Date(p.paused_until).getTime() > Date.now()) ? 'paused' : 'active'
            const seat = p.seat_order ?? index
            const isRight = seat % 2 !== 0
            const row = Math.floor(seat / 2)
            
            return {
                id: p.id,
                name: p.name,
                gender: p.gender || 'm',
                seat_order: seat,
                status,
                pauseEndTime: p.paused_until ? new Date(p.paused_until).getTime() : undefined,
                count: p.total_count || 0,
                mass: (p.total_count || 0) * this.unitWeight,
                velocity: p.velocity_30m || 0,
                lastPufferTime: 0,
                x: isRight ? 200 : 20, 
                y: 80 + (row * 160)
            }
        })
    },

    handleNewLog(log: any) {
        const timestamp = new Date(log.eaten_at).getTime()
        const guest = this.guests.find(g => g.id === log.participant_id)
        this.logs.push({ id: log.id, timestamp, guestId: log.participant_id })
        if (guest) {
            guest.count++
            guest.mass += this.unitWeight
            if (timestamp > guest.lastPufferTime) guest.lastPufferTime = timestamp
        }
    },

    handleRemoveLog(logId: number) {
        const index = this.logs.findIndex(l => l.id === logId)
        if (index === -1) return
        const log = this.logs[index]
        const guest = this.guests.find(g => g.id === log.guestId)
        this.logs.splice(index, 1)
        if (guest) {
            guest.count--
            guest.mass -= this.unitWeight
            const lastLog = this.logs.filter(l => l.guestId === guest.id).sort((a,b) => b.timestamp - a.timestamp)[0]
            guest.lastPufferTime = lastLog ? lastLog.timestamp : 0
        }
    },

    handleNewParticipant(p: any) {
        if (this.guests.find(g => g.id === p.id)) return
        const seat = p.seat_order ?? this.guests.length
        const row = Math.floor(seat / 2)
        const isRight = seat % 2 !== 0
        this.guests.push({
            id: p.id, name: p.name, gender: p.gender || 'm', seat_order: seat,
            status: 'active', count: 0, mass: 0, velocity: 0, lastPufferTime: 0,
            x: isRight ? 200 : 20, y: 80 + (row * 160)
        })
    },

    handleParticipantUpdate(p: any) {
        const guest = this.guests.find(g => g.id === p.id)
        if (guest) {
            guest.status = p.is_knocked_out ? 'ko' : (p.paused_until && new Date(p.paused_until).getTime() > Date.now()) ? 'paused' : 'active'
            guest.name = p.name
            guest.gender = p.gender
            // Refresh coordinates if seat_order changed externally
            if (guest.seat_order !== p.seat_order) {
                guest.seat_order = p.seat_order
                const isRight = guest.seat_order % 2 !== 0
                const row = Math.floor(guest.seat_order / 2)
                guest.x = isRight ? 200 : 20
                guest.y = 80 + (row * 160)
            }
        }
    },

    async addParticipant(name: string, gender: Gender) {
        const supabase = useSupabaseClient<Database>()
        await supabase.from('participants').insert({ name, gender, seat_order: this.guests.length })
    },

    async seedGuests() {
        const boys = ['Lukas', 'Janek', 'Piet', 'Gerrit', 'Tobi', 'Philipp', 'Markus', 'Max']
        const girls = ['Janine', 'Nina', 'Johanna', 'Lisa']
        const toInsert = [
            ...boys.map((name, i) => ({ name, gender: 'm' as const, seat_order: i })),
            ...girls.map((name, i) => ({ name, gender: 'f' as const, seat_order: i + boys.length }))
        ]
        const supabase = useSupabaseClient<Database>()
        const { error } = await supabase.from('participants').insert(toInsert)
        if (!error) {
            const { data } = await supabase.from('extended_stats').select('*').order('seat_order', { ascending: true })
            if (data) this.handleFullSync(data)
        }
    },

    async snapToGrid(guestId: string, rawX: number, rawY: number) {
        const guest = this.guests.find(g => g.id === guestId)
        if (!guest) return
        const COL_LEFT_X = 20, COL_RIGHT_X = 200, ROW_START_Y = 80, ROW_HEIGHT = 160
        const isRight = Math.abs(rawX - COL_RIGHT_X) < Math.abs(rawX - COL_LEFT_X)
        let row = Math.round((rawY - ROW_START_Y) / ROW_HEIGHT)
        if (row < 0) row = 0
        const targetIndex = (row * 2) + (isRight ? 1 : 0)
        const occupant = this.guests.find(g => g.seat_order === targetIndex && g.id !== guestId)
        const supabase = useSupabaseClient<Database>()
        if (occupant) {
            occupant.seat_order = guest.seat_order
            const occRow = Math.floor(occupant.seat_order / 2), occIsRight = occupant.seat_order % 2 !== 0
            occupant.x = occIsRight ? COL_RIGHT_X : COL_LEFT_X
            occupant.y = ROW_START_Y + (occRow * ROW_HEIGHT)
            await supabase.from('participants').update({ seat_order: occupant.seat_order }).eq('id', occupant.id)
        }
        guest.seat_order = targetIndex
        guest.x = isRight ? COL_RIGHT_X : COL_LEFT_X
        guest.y = ROW_START_Y + (row * ROW_HEIGHT)
        await supabase.from('participants').update({ seat_order: guest.seat_order }).eq('id', guest.id)
    },

    async addPuffer(guestId: string) {
      if (this.isFrozen) return
      const supabase = useSupabaseClient<Database>()
      await supabase.from('puffer_logs').insert({ participant_id: guestId })
    },

    async undoPuffer(guestId: string) {
       const supabase = useSupabaseClient<Database>()
       const { data } = await supabase.from('puffer_logs').select('id').eq('participant_id', guestId).order('eaten_at', { ascending: false }).limit(1).single()
       if (data) await supabase.from('puffer_logs').delete().eq('id', data.id)
    },

    async setGuestStatus(guestId: string, status: GuestStatus) {
      const supabase = useSupabaseClient<Database>()
      const updates: any = { is_knocked_out: status === 'ko', paused_until: status === 'paused' ? new Date(Date.now() + 10 * 60000).toISOString() : null }
      await supabase.from('participants').update(updates).eq('id', guestId)
    },

    updatePosition(guestId: string, x: number, y: number) {
        const guest = this.guests.find(g => g.id === guestId)
        if (guest) { guest.x = x; guest.y = y; }
    },

    checkPauseTimers() {
      const now = Date.now()
      this.guests.forEach(g => { if (g.status === 'paused' && g.pauseEndTime && now > g.pauseEndTime) g.status = 'active' })
    },

    async resetEvent() {
        const supabase = useSupabaseClient<Database>()
        await supabase.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('event_config').update({ event_start: new Date().toISOString(), is_frozen: false, last_roast_phrases: null }).eq('id', 1)
        this.guests = []; this.logs = []; this.startTime = Date.now(); this.isFrozen = false; this.lastRoastPhrases = []
    }
  }
})
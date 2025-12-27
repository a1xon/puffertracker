export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const stats = body.stats || {}
  const time = new Date()
  
  let timePhrase = "Phase: Warm Up"
  if (time.getHours() > 20) timePhrase = "Phase: Mid-Game Hunger"
  if (time.getHours() > 22) timePhrase = "Phase: Satiety Critical"
  
  const leaderboard = stats.leaderboard || []
  const top = leaderboard[0]
  const bottom = leaderboard.length > 1 ? leaderboard[leaderboard.length - 1] : null
  
  let status = "Event in progress"
  let target = "Keep eating!"

  if (top) {
    status = `${top.name} is leading with ${top.count} units (${top.velocity} pp30m)`
  }

  if (bottom) {
    target = `${bottom.name} is lagging behind at ${bottom.velocity} pp30m. Pathhetic.`
  } else if (top && top.count > 10) {
    target = `${top.name} is an absolute beast. Who can stop them?`
  }

  return {
    statusPhrase: status.toUpperCase(),
    targetPhrase: target,
    timePhrase: timePhrase
  }
})
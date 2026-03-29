import { db, setPieceTemplatesTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";

const SEED_TEMPLATES = [
  {
    title: "Near Post Flick",
    category: "offensive_corner_left" as const,
    description: "Classic near post corner with a flick-on to the far post area. The delivery targets the near post where a strong header flicks towards the far post runners.",
    coachingNote: "Delivery must be fast and flat to the near post. Timing of runs is everything.",
    defaultRoles: [
      { name: "Delivery", description: "Takes the corner kick", coachingPoint: "Fast, flat delivery to near post", startPosition: { x: 0, y: 0 } },
      { name: "Near Post Flick", description: "First contact at near post", coachingPoint: "Glancing header towards far post", startPosition: { x: 35, y: 25 } },
      { name: "Far Post Target", description: "Arrives at far post for the flick", coachingPoint: "Time your run to arrive with the flick", startPosition: { x: 60, y: 15 } },
      { name: "Edge Runner", description: "Attacks the edge of the box", coachingPoint: "Look for rebounds or second ball", startPosition: { x: 40, y: 45 } },
      { name: "Short Option", description: "Offers a short corner option", coachingPoint: "Only if signaled, otherwise decoy", startPosition: { x: 10, y: 5 } },
    ],
  },
  {
    title: "Back Post Bomb",
    category: "offensive_corner_left" as const,
    description: "High delivery to the back post where the tallest attacker attacks from deep. Decoy runners clear the zone.",
    coachingNote: "Delivery MUST be to the back post. Decoy runners clear at the right moment.",
    defaultRoles: [
      { name: "Delivery", description: "High corner to far post", coachingPoint: "High, hanging delivery to back post", startPosition: { x: 0, y: 0 } },
      { name: "Target Man", description: "Far post header", coachingPoint: "Attack from deep, aggressive header", startPosition: { x: 65, y: 25 } },
      { name: "Decoy Near", description: "Clear the zone", coachingPoint: "Pull defenders away early", startPosition: { x: 35, y: 20 } },
      { name: "Decoy Central", description: "Central decoy", coachingPoint: "Make a run then peel off", startPosition: { x: 45, y: 22 } },
      { name: "Rebound", description: "Follow up", coachingPoint: "Anticipate the header direction", startPosition: { x: 50, y: 35 } },
    ],
  },
  {
    title: "Far Post Overload",
    category: "offensive_corner_right" as const,
    description: "Overload the far post with three attackers making staggered runs. Creates chaos in the defensive zone.",
    coachingNote: "Stagger runs: first runner pulls defender, second attacks space, third covers rebounds.",
    defaultRoles: [
      { name: "Delivery", description: "Takes the corner", coachingPoint: "Outswinging delivery to far post zone", startPosition: { x: 100, y: 0 } },
      { name: "First Runner", description: "Lead run to far post", coachingPoint: "Drag defender away, create space", startPosition: { x: 55, y: 30 } },
      { name: "Second Runner", description: "Attack the space", coachingPoint: "Attack the gap left by first runner", startPosition: { x: 50, y: 25 } },
      { name: "Third Runner", description: "Cover rebounds", coachingPoint: "Arrive late for any rebounds", startPosition: { x: 45, y: 35 } },
      { name: "Blocker", description: "Screen the goalkeeper", coachingPoint: "Legal screen, hold your ground", startPosition: { x: 40, y: 20 } },
    ],
  },
  {
    title: "Zonal Wall",
    category: "defensive_corner_left" as const,
    description: "Zone-based defensive setup with players marking spaces rather than players. Priorities: first contact, near post, far post, edge of box.",
    coachingNote: "Own your zone. Attack the ball aggressively when it enters your area.",
    defaultRoles: [
      { name: "Near Post Guard", description: "Covers near post zone", coachingPoint: "Nothing gets past the near post", startPosition: { x: 30, y: 20 } },
      { name: "Central Zone 1", description: "Central defensive zone", coachingPoint: "Aggressive clearance, head it high and wide", startPosition: { x: 40, y: 20 } },
      { name: "Central Zone 2", description: "Second central zone", coachingPoint: "Cover behind Zone 1", startPosition: { x: 50, y: 20 } },
      { name: "Far Post Guard", description: "Far post zone", coachingPoint: "Sweep anything coming to the far post", startPosition: { x: 60, y: 20 } },
      { name: "Edge Sweeper", description: "Edge of box clearance", coachingPoint: "Clear second balls, prevent shots", startPosition: { x: 45, y: 40 } },
    ],
  },
  {
    title: "Man-Mark Press",
    category: "defensive_corner_right" as const,
    description: "Man-marking defensive corner with each player assigned a specific attacker. Goalkeeper commands the area.",
    coachingNote: "Stay tight to your man. Go with them, not the ball. GK calls for everything in the 6-yard box.",
    defaultRoles: [
      { name: "Marker 1", description: "Marks tallest attacker", coachingPoint: "Stay goalside, be physical", startPosition: { x: 35, y: 20 } },
      { name: "Marker 2", description: "Marks second target", coachingPoint: "Stay tight, don't get turned", startPosition: { x: 45, y: 22 } },
      { name: "Marker 3", description: "Marks edge runner", coachingPoint: "Don't let them get a clean run", startPosition: { x: 50, y: 35 } },
      { name: "Near Post", description: "Protects near post", coachingPoint: "Head everything at near post", startPosition: { x: 30, y: 15 } },
      { name: "Counter Runner", description: "First to break on clearance", coachingPoint: "Sprint on clearance, start the counter", startPosition: { x: 55, y: 50 } },
    ],
  },
  {
    title: "Wall Buster",
    category: "direct_free_kick_central" as const,
    description: "Direct free kick from central position. Two-man setup with a shooter and a decoy. Wall manipulation and curved shot.",
    coachingNote: "Decoy runs over the ball. Shooter aims for the far post with curve.",
    defaultRoles: [
      { name: "Shooter", description: "Takes the shot", coachingPoint: "Curve it over or around the wall, aim far post", startPosition: { x: 50, y: 60 } },
      { name: "Decoy", description: "Runs over the ball", coachingPoint: "Sell the run, look like you're shooting", startPosition: { x: 48, y: 60 } },
      { name: "Wall Crasher", description: "Charges the wall gap", coachingPoint: "Time your run through any gap in the wall", startPosition: { x: 45, y: 45 } },
      { name: "Rebound Hunter", description: "Follows up for rebounds", coachingPoint: "Anticipate the save direction", startPosition: { x: 55, y: 40 } },
      { name: "Edge Cover", description: "Covers the edge for pullbacks", coachingPoint: "Stay alert for a pullback pass", startPosition: { x: 40, y: 55 } },
    ],
  },
  {
    title: "Training Ground Special",
    category: "direct_free_kick_central" as const,
    description: "Rehearsed routine with a disguised pass into a shooting position. Two decoys run over the ball while the third lays off.",
    coachingNote: "Timing must be drilled. The disguise only works if decoys sell it.",
    defaultRoles: [
      { name: "Passer", description: "Plays disguised pass", coachingPoint: "Wait for decoys to move, then slide pass right", startPosition: { x: 50, y: 58 } },
      { name: "Decoy 1", description: "Runs over ball left", coachingPoint: "Sprint past convincingly", startPosition: { x: 48, y: 58 } },
      { name: "Decoy 2", description: "Runs over ball right", coachingPoint: "Full speed run", startPosition: { x: 52, y: 58 } },
      { name: "Shooter", description: "Receives and shoots", coachingPoint: "One touch shot, low and hard", startPosition: { x: 58, y: 52 } },
      { name: "Follow Up", description: "Covers rebounds", coachingPoint: "Attack rebounds from either side", startPosition: { x: 45, y: 40 } },
    ],
  },
  {
    title: "Quick Wide Play",
    category: "indirect_free_kick_wide" as const,
    description: "Indirect free kick from wide position. Quick combination play to create a crossing opportunity.",
    coachingNote: "Speed is key. First pass must be quick, cross must be early.",
    defaultRoles: [
      { name: "Taker", description: "Plays the initial pass", coachingPoint: "Quick, short pass to runner", startPosition: { x: 15, y: 55 } },
      { name: "Runner", description: "Receives and crosses", coachingPoint: "One touch and cross early", startPosition: { x: 20, y: 50 } },
      { name: "Near Post", description: "Near post run", coachingPoint: "Sprint to near post", startPosition: { x: 40, y: 30 } },
      { name: "Far Post", description: "Far post run", coachingPoint: "Arrive late at far post", startPosition: { x: 55, y: 25 } },
      { name: "Edge", description: "Edge of box", coachingPoint: "Look for cutbacks", startPosition: { x: 35, y: 45 } },
    ],
  },
  {
    title: "Long Throw Flick",
    category: "attacking_throw_in" as const,
    description: "Long throw-in into the box with a near-post flick-on. Creates a second-ball opportunity in a dangerous area.",
    coachingNote: "Thrower must target the near post zone. Everyone else reacts to the flick.",
    defaultRoles: [
      { name: "Thrower", description: "Takes the long throw", coachingPoint: "Flat trajectory to near post", startPosition: { x: 0, y: 30 } },
      { name: "Flick Target", description: "Flicks on at near post", coachingPoint: "Glancing touch towards goal", startPosition: { x: 25, y: 22 } },
      { name: "Goal Poacher", description: "Attacks the flick-on", coachingPoint: "Be first to react", startPosition: { x: 35, y: 18 } },
      { name: "Far Post", description: "Far post cover", coachingPoint: "Sweep up anything going wide", startPosition: { x: 45, y: 15 } },
    ],
  },
  {
    title: "Safe Outlet",
    category: "defensive_throw_in" as const,
    description: "Defensive throw-in pattern to retain possession safely. Two short options and one long option.",
    coachingNote: "Keep it simple. Retain possession first, then look to progress.",
    defaultRoles: [
      { name: "Thrower", description: "Takes the throw", coachingPoint: "Quick release, closest open player", startPosition: { x: 0, y: 70 } },
      { name: "Short Option 1", description: "Close support", coachingPoint: "Show for the ball, play it back if pressed", startPosition: { x: 10, y: 65 } },
      { name: "Short Option 2", description: "Second short option", coachingPoint: "Move to create an angle", startPosition: { x: 15, y: 72 } },
      { name: "Long Option", description: "Target for long throw", coachingPoint: "Win the first ball if thrown long", startPosition: { x: 30, y: 60 } },
    ],
  },
];

export async function seedTemplates(): Promise<void> {
  try {
    const [result] = await db.select({ value: count() }).from(setPieceTemplatesTable);
    if (result && result.value > 0) {
      logger.info({ count: result.value }, "Templates already seeded, skipping");
      return;
    }

    await db.insert(setPieceTemplatesTable).values(SEED_TEMPLATES);
    logger.info({ count: SEED_TEMPLATES.length }, "Seeded set piece templates");
  } catch (err) {
    logger.error({ err }, "Failed to seed templates");
  }
}

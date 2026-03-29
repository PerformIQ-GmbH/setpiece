import { db } from "@workspace/db";
import {
  usersTable,
  teamsTable,
  membershipsTable,
  playersTable,
  setPieceTemplatesTable,
  setPiecesTable,
  setPieceRolesTable,
  roleAssignmentsTable,
  playerReadinessTable,
  matchdaysTable,
  matchdaySetPiecesTable,
  auditEventsTable,
  shareLinksTable,
} from "@workspace/db";
import crypto from "crypto";

async function seed() {
  console.log("Seeding database...");

  const [demoUser] = await db
    .insert(usersTable)
    .values({
      id: "demo-coach-001",
      email: "coach@fcdemo.com",
      firstName: "Marco",
      lastName: "Rossi",
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { email: "coach@fcdemo.com", firstName: "Marco", lastName: "Rossi" },
    })
    .returning();

  console.log("Created demo user:", demoUser.id);

  const [team] = await db
    .insert(teamsTable)
    .values({
      name: "FC Demo",
      clubName: "FC Demo United",
      coachName: "Marco Rossi",
      logoUrl: null,
      teamColors: { primary: "#1e3a5f", secondary: "#e2b53a" },
      ownerId: demoUser.id,
      tier: "solo_coach",
    })
    .returning();

  await db
    .insert(membershipsTable)
    .values({ userId: demoUser.id, teamId: team.id, role: "head_coach" })
    .onConflictDoNothing();

  console.log("Created team:", team.name);

  const playerData = [
    { firstName: "Luca", lastName: "Bianchi", shirtNumber: 1, dominantFoot: "right", height: 188, tags: ["strong_blocker"], headingStrength: 7, speed: 4, notes: "Goalkeeper" },
    { firstName: "Marco", lastName: "Ferrari", shirtNumber: 2, dominantFoot: "right", height: 182, tags: ["fast_runner", "strong_blocker"], headingStrength: 6, speed: 7, notes: "Right back" },
    { firstName: "Andrea", lastName: "Romano", shirtNumber: 3, dominantFoot: "left", height: 185, tags: ["left_foot", "strong_blocker"], headingStrength: 7, speed: 5, notes: "Left back" },
    { firstName: "Davide", lastName: "Colombo", shirtNumber: 4, dominantFoot: "right", height: 190, tags: ["best_header", "strong_blocker"], headingStrength: 9, speed: 5, notes: "Centre back, aerial specialist" },
    { firstName: "Stefano", lastName: "Ricci", shirtNumber: 5, dominantFoot: "right", height: 187, tags: ["strong_blocker"], headingStrength: 8, speed: 5, notes: "Centre back" },
    { firstName: "Giorgio", lastName: "Galli", shirtNumber: 6, dominantFoot: "right", height: 178, tags: ["delivery_specialist"], headingStrength: 5, speed: 6, notes: "Defensive midfielder" },
    { firstName: "Paolo", lastName: "Martini", shirtNumber: 7, dominantFoot: "right", height: 175, tags: ["fast_runner", "delivery_specialist"], headingStrength: 4, speed: 9, notes: "Right winger" },
    { firstName: "Alessandro", lastName: "Russo", shirtNumber: 8, dominantFoot: "right", height: 180, tags: ["rebound_hunter"], headingStrength: 6, speed: 7, notes: "Box-to-box midfielder" },
    { firstName: "Matteo", lastName: "Conti", shirtNumber: 9, dominantFoot: "right", height: 186, tags: ["best_header", "far_post_target"], headingStrength: 9, speed: 6, notes: "Centre forward, target man" },
    { firstName: "Lorenzo", lastName: "Bruno", shirtNumber: 10, dominantFoot: "left", height: 173, tags: ["left_foot", "delivery_specialist"], headingStrength: 3, speed: 8, notes: "Playmaker, set piece taker" },
    { firstName: "Fabio", lastName: "Moretti", shirtNumber: 11, dominantFoot: "left", height: 177, tags: ["left_foot", "fast_runner"], headingStrength: 5, speed: 9, notes: "Left winger" },
    { firstName: "Roberto", lastName: "Costa", shirtNumber: 14, dominantFoot: "right", height: 183, tags: ["rebound_hunter", "strong_blocker"], headingStrength: 7, speed: 6, notes: "Utility midfielder" },
    { firstName: "Simone", lastName: "Marchetti", shirtNumber: 16, dominantFoot: "right", height: 189, tags: ["best_header", "far_post_target"], headingStrength: 8, speed: 5, notes: "Backup striker" },
    { firstName: "Nicola", lastName: "Villa", shirtNumber: 22, dominantFoot: "right", height: 186, tags: ["strong_blocker"], headingStrength: 6, speed: 4, notes: "Reserve goalkeeper", status: "active" as const },
  ];

  const players = [];
  for (const pd of playerData) {
    const [p] = await db
      .insert(playersTable)
      .values({ ...pd, teamId: team.id, status: (pd as { status?: string }).status || "active" } as typeof playersTable.$inferInsert)
      .returning();
    players.push(p);
  }
  console.log(`Created ${players.length} players`);

  const templates = [
    {
      title: "Near Post Flick",
      category: "offensive_corner_left" as const,
      description: "Classic near post corner with a flick-on to the far post area. The delivery targets the near post where a strong header flicks towards the far post runners.",
      coachingNote: "Delivery must be fast and flat to the near post. Timing of runs is everything.",
      previewImageUrl: "https://placehold.co/400x300/2d5a3d/ffffff?text=Near+Post+Flick",
      defaultRoles: [
        { name: "Delivery", description: "Takes the corner kick", startPosition: { x: 0, y: 0 }, coachingPoint: "Fast, flat delivery to near post" },
        { name: "Near Post Flick", description: "First contact at near post", startPosition: { x: 35, y: 25 }, coachingPoint: "Glancing header towards far post" },
        { name: "Far Post Target", description: "Arrives at far post for the flick", startPosition: { x: 60, y: 15 }, coachingPoint: "Time your run to arrive with the flick" },
        { name: "Edge Runner", description: "Attacks the edge of the box", startPosition: { x: 40, y: 45 }, coachingPoint: "Look for rebounds or second ball" },
        { name: "Short Option", description: "Offers a short corner option", startPosition: { x: 10, y: 5 }, coachingPoint: "Only if signaled, otherwise decoy" },
      ],
    },
    {
      title: "Far Post Overload",
      category: "offensive_corner_right" as const,
      description: "Overload the far post with three attackers making staggered runs. Creates chaos in the defensive zone.",
      coachingNote: "Stagger runs: first runner pulls defender, second attacks space, third covers rebounds.",
      previewImageUrl: "https://placehold.co/400x300/2d5a3d/ffffff?text=Far+Post+Overload",
      defaultRoles: [
        { name: "Delivery", description: "Takes the corner", startPosition: { x: 100, y: 0 }, coachingPoint: "Outswinging delivery to far post zone" },
        { name: "First Runner", description: "Lead run to far post", startPosition: { x: 55, y: 30 }, coachingPoint: "Drag defender away, create space" },
        { name: "Second Runner", description: "Attack the space", startPosition: { x: 50, y: 25 }, coachingPoint: "Attack the gap left by first runner" },
        { name: "Third Runner", description: "Cover rebounds", startPosition: { x: 45, y: 35 }, coachingPoint: "Arrive late for any rebounds" },
        { name: "Blocker", description: "Screen the goalkeeper", startPosition: { x: 40, y: 20 }, coachingPoint: "Legal screen, hold your ground" },
      ],
    },
    {
      title: "Zonal Wall",
      category: "defensive_corner_left" as const,
      description: "Zone-based defensive setup with players marking spaces rather than players. Priorities: first contact, near post, far post, edge of box.",
      coachingNote: "Own your zone. Attack the ball aggressively when it enters your area.",
      previewImageUrl: "https://placehold.co/400x300/5a2d2d/ffffff?text=Zonal+Wall",
      defaultRoles: [
        { name: "Near Post Guard", description: "Covers near post zone", startPosition: { x: 30, y: 20 }, coachingPoint: "Nothing gets past the near post" },
        { name: "Central Zone 1", description: "Central defensive zone", startPosition: { x: 40, y: 20 }, coachingPoint: "Aggressive clearance, head it high and wide" },
        { name: "Central Zone 2", description: "Second central zone", startPosition: { x: 50, y: 20 }, coachingPoint: "Cover behind Zone 1" },
        { name: "Far Post Guard", description: "Far post zone", startPosition: { x: 60, y: 20 }, coachingPoint: "Sweep anything coming to the far post" },
        { name: "Edge Sweeper", description: "Edge of box clearance", startPosition: { x: 45, y: 40 }, coachingPoint: "Clear second balls, prevent shots" },
      ],
    },
    {
      title: "Man-Mark Press",
      category: "defensive_corner_right" as const,
      description: "Man-marking defensive corner with each player assigned a specific attacker. Goalkeeper commands the area.",
      coachingNote: "Stay tight to your man. Go with them, not the ball. GK calls for everything in the 6-yard box.",
      previewImageUrl: "https://placehold.co/400x300/5a2d2d/ffffff?text=Man-Mark+Press",
      defaultRoles: [
        { name: "Marker 1", description: "Marks tallest attacker", startPosition: { x: 35, y: 20 }, coachingPoint: "Stay goalside, be physical" },
        { name: "Marker 2", description: "Marks second target", startPosition: { x: 45, y: 22 }, coachingPoint: "Stay tight, don't get turned" },
        { name: "Marker 3", description: "Marks edge runner", startPosition: { x: 50, y: 35 }, coachingPoint: "Don't let them get a clean run" },
        { name: "Near Post", description: "Protects near post", startPosition: { x: 30, y: 15 }, coachingPoint: "Head everything at near post" },
        { name: "Counter Runner", description: "First to break on clearance", startPosition: { x: 55, y: 50 }, coachingPoint: "Sprint on clearance, start the counter" },
      ],
    },
    {
      title: "Wall Buster",
      category: "direct_free_kick_central" as const,
      description: "Direct free kick from central position. Two-man setup with a shooter and a decoy. Wall manipulation and curved shot.",
      coachingNote: "Decoy runs over the ball. Shooter aims for the far post with curve.",
      previewImageUrl: "https://placehold.co/400x300/3d2d5a/ffffff?text=Wall+Buster",
      defaultRoles: [
        { name: "Shooter", description: "Takes the shot", startPosition: { x: 50, y: 60 }, coachingPoint: "Curve it over or around the wall, aim far post" },
        { name: "Decoy", description: "Runs over the ball", startPosition: { x: 48, y: 60 }, coachingPoint: "Sell the run, look like you're shooting" },
        { name: "Wall Crasher", description: "Charges the wall gap", startPosition: { x: 45, y: 45 }, coachingPoint: "Time your run through any gap in the wall" },
        { name: "Rebound Hunter", description: "Follows up for rebounds", startPosition: { x: 55, y: 40 }, coachingPoint: "Anticipate the save direction" },
        { name: "Edge Cover", description: "Covers the edge for pullbacks", startPosition: { x: 40, y: 55 }, coachingPoint: "Stay alert for a pullback pass" },
      ],
    },
    {
      title: "Quick Wide Play",
      category: "indirect_free_kick_wide" as const,
      description: "Indirect free kick from wide position. Quick combination play to create a crossing opportunity.",
      coachingNote: "Speed is key. First pass must be quick, cross must be early.",
      previewImageUrl: "https://placehold.co/400x300/3d2d5a/ffffff?text=Quick+Wide+Play",
      defaultRoles: [
        { name: "Taker", description: "Plays the initial pass", startPosition: { x: 15, y: 55 }, coachingPoint: "Quick, short pass to runner" },
        { name: "Runner", description: "Receives and crosses", startPosition: { x: 20, y: 50 }, coachingPoint: "One touch and cross early" },
        { name: "Near Post", description: "Near post run", startPosition: { x: 40, y: 30 }, coachingPoint: "Sprint to near post" },
        { name: "Far Post", description: "Far post run", startPosition: { x: 55, y: 25 }, coachingPoint: "Arrive late at far post" },
        { name: "Edge", description: "Edge of box", startPosition: { x: 35, y: 45 }, coachingPoint: "Look for cutbacks" },
      ],
    },
    {
      title: "Long Throw Flick",
      category: "attacking_throw_in" as const,
      description: "Long throw-in into the box with a near-post flick-on. Creates a second-ball opportunity in a dangerous area.",
      coachingNote: "Thrower must target the near post zone. Everyone else reacts to the flick.",
      previewImageUrl: "https://placehold.co/400x300/5a4a2d/ffffff?text=Long+Throw+Flick",
      defaultRoles: [
        { name: "Thrower", description: "Takes the long throw", startPosition: { x: 0, y: 30 }, coachingPoint: "Flat trajectory to near post" },
        { name: "Flick Target", description: "Flicks on at near post", startPosition: { x: 25, y: 22 }, coachingPoint: "Glancing touch towards goal" },
        { name: "Goal Poacher", description: "Attacks the flick-on", startPosition: { x: 35, y: 18 }, coachingPoint: "Be first to react" },
        { name: "Far Post", description: "Far post cover", startPosition: { x: 45, y: 15 }, coachingPoint: "Sweep up anything going wide" },
      ],
    },
    {
      title: "Safe Outlet",
      category: "defensive_throw_in" as const,
      description: "Defensive throw-in pattern to retain possession safely. Two short options and one long option.",
      coachingNote: "Keep it simple. Retain possession first, then look to progress.",
      previewImageUrl: "https://placehold.co/400x300/5a4a2d/ffffff?text=Safe+Outlet",
      defaultRoles: [
        { name: "Thrower", description: "Takes the throw", startPosition: { x: 0, y: 70 }, coachingPoint: "Quick release, closest open player" },
        { name: "Short Option 1", description: "Close support", startPosition: { x: 10, y: 65 }, coachingPoint: "Show for the ball, play it back if pressed" },
        { name: "Short Option 2", description: "Second short option", startPosition: { x: 15, y: 72 }, coachingPoint: "Move to create an angle" },
        { name: "Long Option", description: "Target for long throw", startPosition: { x: 30, y: 60 }, coachingPoint: "Win the first ball if thrown long" },
      ],
    },
    {
      title: "Back Post Bomb",
      category: "offensive_corner_left" as const,
      description: "High delivery to the back post where the tallest attacker attacks from deep. Decoy runners clear the zone.",
      coachingNote: "Delivery MUST be to the back post. Decoy runners clear at the right moment.",
      previewImageUrl: "https://placehold.co/400x300/2d5a3d/ffffff?text=Back+Post+Bomb",
      defaultRoles: [
        { name: "Delivery", description: "High corner to far post", startPosition: { x: 0, y: 0 }, coachingPoint: "High, hanging delivery to back post" },
        { name: "Target Man", description: "Far post header", startPosition: { x: 65, y: 25 }, coachingPoint: "Attack from deep, aggressive header" },
        { name: "Decoy Near", description: "Clear the zone", startPosition: { x: 35, y: 20 }, coachingPoint: "Pull defenders away early" },
        { name: "Decoy Central", description: "Central decoy", startPosition: { x: 45, y: 22 }, coachingPoint: "Make a run then peel off" },
        { name: "Rebound", description: "Follow up", startPosition: { x: 50, y: 35 }, coachingPoint: "Anticipate the header direction" },
      ],
    },
    {
      title: "Training Ground Special",
      category: "direct_free_kick_central" as const,
      description: "Rehearsed routine with a disguised pass into a shooting position. Two decoys run over the ball while the third lays off.",
      coachingNote: "Timing must be drilled. The disguise only works if decoys sell it.",
      previewImageUrl: "https://placehold.co/400x300/3d2d5a/ffffff?text=Training+Ground+Special",
      defaultRoles: [
        { name: "Passer", description: "Plays disguised pass", startPosition: { x: 50, y: 58 }, coachingPoint: "Wait for decoys to move, then slide pass right" },
        { name: "Decoy 1", description: "Runs over ball left", startPosition: { x: 48, y: 58 }, coachingPoint: "Sprint past convincingly" },
        { name: "Decoy 2", description: "Runs over ball right", startPosition: { x: 52, y: 58 }, coachingPoint: "Full speed run" },
        { name: "Shooter", description: "Receives and shoots", startPosition: { x: 58, y: 52 }, coachingPoint: "One touch shot, low and hard" },
        { name: "Follow Up", description: "Covers rebounds", startPosition: { x: 45, y: 40 }, coachingPoint: "Attack rebounds from either side" },
      ],
    },
  ];

  const createdTemplates = [];
  for (const t of templates) {
    const [template] = await db.insert(setPieceTemplatesTable).values(t).returning();
    createdTemplates.push(template);
  }
  console.log(`Created ${createdTemplates.length} templates`);

  const setPieceData = [
    { title: "Corner Left - Near Post Flick", category: "offensive_corner_left" as const, status: "active_matchday" as const, templateIdx: 0, previewImageUrl: "https://placehold.co/600x400/1e3a5f/e2b53a?text=Near+Post+Flick" },
    { title: "Corner Right - Far Post Overload", category: "offensive_corner_right" as const, status: "ready" as const, templateIdx: 1, previewImageUrl: "https://placehold.co/600x400/1e3a5f/e2b53a?text=Far+Post+Overload" },
    { title: "Defensive Corner Left - Zonal", category: "defensive_corner_left" as const, status: "active_matchday" as const, templateIdx: 2, previewImageUrl: "https://placehold.co/600x400/1e3a5f/e2b53a?text=Zonal+Wall" },
    { title: "Free Kick Central - Wall Buster", category: "direct_free_kick_central" as const, status: "active_matchday" as const, templateIdx: 4, previewImageUrl: "https://placehold.co/600x400/1e3a5f/e2b53a?text=Wall+Buster" },
    { title: "Attacking Throw-in - Long Flick", category: "attacking_throw_in" as const, status: "draft" as const, templateIdx: 6, previewImageUrl: null },
  ];

  const createdPieces = [];
  for (const spd of setPieceData) {
    const template = createdTemplates[spd.templateIdx];
    const [piece] = await db
      .insert(setPiecesTable)
      .values({
        teamId: team.id,
        title: spd.title,
        category: spd.category,
        status: spd.status,
        description: template.description,
        boardData: template.boardData,
        coachingNotes: template.coachingNote,
        previewImageUrl: spd.previewImageUrl,
        createdBy: demoUser.id,
        updatedBy: demoUser.id,
      })
      .returning();

    if (template.defaultRoles) {
      for (let i = 0; i < template.defaultRoles.length; i++) {
        const rd = template.defaultRoles[i];
        const [role] = await db
          .insert(setPieceRolesTable)
          .values({
            setPieceId: piece.id,
            name: rd.name,
            description: rd.description || null,
            startPosition: rd.startPosition,
            coachingPoint: rd.coachingPoint || null,
            sortOrder: i,
          })
          .returning();

        const playerIdx = Math.min(i, players.length - 1);
        const assignPlayer = spd.status !== "draft" ? players[playerIdx + (spd.templateIdx % 3)] || players[playerIdx] : null;

        if (assignPlayer) {
          await db.insert(roleAssignmentsTable).values({
            roleId: role.id,
            playerId: assignPlayer.id,
            backupPlayerId: players[(playerIdx + 5) % players.length]?.id || null,
          });
        }
      }
    }

    createdPieces.push(piece);
    await db.insert(auditEventsTable).values({
      teamId: team.id,
      userId: demoUser.id,
      eventType: "set_piece_created",
      entityType: "set_piece",
      entityId: piece.id,
      metadata: { title: piece.title },
    });
  }
  console.log(`Created ${createdPieces.length} set pieces with roles and assignments`);

  const readinessStatuses: Array<{ playerIdx: number; pieceIdx: number; status: "not_opened" | "opened" | "passed" | "needs_review" }> = [
    { playerIdx: 0, pieceIdx: 0, status: "passed" },
    { playerIdx: 1, pieceIdx: 0, status: "passed" },
    { playerIdx: 2, pieceIdx: 0, status: "opened" },
    { playerIdx: 3, pieceIdx: 0, status: "passed" },
    { playerIdx: 4, pieceIdx: 0, status: "not_opened" },
    { playerIdx: 5, pieceIdx: 0, status: "needs_review" },
    { playerIdx: 6, pieceIdx: 0, status: "passed" },
    { playerIdx: 7, pieceIdx: 1, status: "passed" },
    { playerIdx: 8, pieceIdx: 1, status: "opened" },
    { playerIdx: 9, pieceIdx: 1, status: "passed" },
    { playerIdx: 10, pieceIdx: 2, status: "passed" },
    { playerIdx: 3, pieceIdx: 3, status: "passed" },
    { playerIdx: 8, pieceIdx: 3, status: "needs_review" },
  ];

  for (const rs of readinessStatuses) {
    await db.insert(playerReadinessTable).values({
      playerId: players[rs.playerIdx].id,
      setPieceId: createdPieces[rs.pieceIdx].id,
      status: rs.status,
      lastOpenedAt: rs.status !== "not_opened" ? new Date() : null,
      readyAt: rs.status === "passed" ? new Date() : null,
      quizCompletedAt: rs.status === "passed" || rs.status === "needs_review" ? new Date() : null,
      viewCount: rs.status === "not_opened" ? 0 : Math.floor(Math.random() * 5) + 1,
    }).onConflictDoNothing();
  }
  console.log("Created readiness statuses");

  const [matchday] = await db
    .insert(matchdaysTable)
    .values({
      teamId: team.id,
      title: "vs FC Rival - League Match",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      opponent: "FC Rival",
      notes: "Important league match. Focus on set pieces.",
    })
    .returning();

  for (let i = 0; i < 3; i++) {
    await db.insert(matchdaySetPiecesTable).values({
      matchdayId: matchday.id,
      setPieceId: createdPieces[i].id,
      sortOrder: i,
    });
  }
  console.log("Created matchday with 3 active set pieces");

  const shareToken = crypto.randomBytes(32).toString("hex");
  await db.insert(shareLinksTable).values({
    teamId: team.id,
    token: shareToken,
    matchdayScope: matchday.id,
    createdBy: demoUser.id,
  });
  console.log("Created share link with token:", shareToken.substring(0, 16) + "...");

  await db.insert(auditEventsTable).values([
    { teamId: team.id, userId: demoUser.id, eventType: "matchday_created" as const, entityType: "matchday", entityId: matchday.id, metadata: { title: matchday.title } },
    { teamId: team.id, userId: demoUser.id, eventType: "share_link_generated" as const, entityType: "share_link", entityId: shareToken.substring(0, 8), metadata: { scope: "matchday" } },
  ]);

  console.log("\nSeed complete!");
  console.log(`Team: ${team.name} (${team.id})`);
  console.log(`Players: ${players.length}`);
  console.log(`Templates: ${createdTemplates.length}`);
  console.log(`Set Pieces: ${createdPieces.length}`);
  console.log(`Matchday: ${matchday.title}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

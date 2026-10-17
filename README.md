# The Grimoire

A Blood on the Clocktower town square for playing with friends over Discord. The Storyteller runs the
game from their browser; players open a link, take a seat and see their character, the night's
information and the votes, all live.

It's a static site on GitHub Pages, published from the `docs/` folder. There's no server and no
logins: the Storyteller's browser is the game's host, and players connect straight to it.

## Running a game

1. **Open the site** and choose **Open a new room**. You get a room code, eight empty seats and
   Trouble Brewing. Change the script under **Game → Change script** (Trouble Brewing, Bad Moon Rising,
   Sects & Violets, or paste a custom script from the official script tool).
2. **Invite players.** Click the room code at the top left and copy the link into your Discord channel.
   Each player opens it, clicks an empty seat and types their name. Add or remove seats from **Game** or
   the **Bag**.
3. **Fill the bag** (**Bag**). The counters show how many Townsfolk, Outsiders, Minions and Demons this
   many players need, including setup changes like the Baron's. Click characters in, or press
   **Random bag**.
4. **Hand them out** (the bag's second step). **Deal at random**, or click a seat then a token to choose.
   Click two seats to swap them. The Drunk, Lunatic and Marionette get a "thinks they are" token, which
   is what that player sees. Nothing is visible to players until you press **Show players their
   characters**.
5. **Run the night.** **Night order** lists only the characters in play, in order, with who has each
   one. The eye button beside a character wakes those players with the right cards already laid out.
   **Minion info** and **Demon info** do the evil team's first night, including the three bluffs from
   the bottom left. In the wake screen you can add signals (Yes, No, Good, Evil, numbers), players,
   characters, any of the eight info cards and your own text, and ask the player to choose players, a
   character or yes/no. Their answer comes back to you. **Put to sleep** when you're done.
6. **Run the day.** Switch to **Day** at the top. Click a player for their menu: kill, ghost votes,
   reminders, swap or move seats, rename, and **Nominate…** (then click who they nominated). In the
   centre, **Countdown** or **Start** sends the clock hand round; players raise their hands on their
   own screens and each vote locks as the hand passes. **Mark for execution** puts them on the block.
7. **End of game:** **Game → Reveal the grimoire** shows everyone every character.

**Hide grimoire** at the top hides every character on your screen, for when you're sharing it on
Discord. Your game saves in your browser, so you can refresh or close the tab and come back; players
reconnect on their own.

## How the connection works

Players' browsers find the Storyteller through the free [PeerJS](https://peerjs.com/) lobby server,
then talk directly. If that lobby is down, they automatically try a backup route a few seconds later:
a pool of public Nostr relays (via [Trystero](https://github.com/dmotz/trystero)), which pass along
only connection details, encrypted with the room code. Either way the game itself travels directly
between browsers, and each player only ever receives their own character and information.

If neither route works for you, run your own PeerServer and put its address in `docs/config.js`.

## Files

| Path | What it is |
|---|---|
| `src/` | The app (React and TypeScript). `src/state/host.ts` holds the game rules and actions; `src/net/` the connections |
| `src/data/` | Characters, night order and jinxes from the official toolmaker resources |
| `public/assets/` | Character icons, edition logos and the Community Created Content badge |
| `public/config.js` | Settings for the published copy (copied to `docs/config.js`) |
| `tools/build-data.mjs` | Refreshes `src/data` and the icons from a copy of [botc-release](https://github.com/ThePandemoniumInstitute/botc-release) |
| `tools/test-relay.mjs` | A tiny relay for testing the backup route locally |
| `docs/` | The published site (built; don't edit by hand) |

## Changing the site

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # rebuilds docs/
```

Commit the rebuilt `docs/` folder and GitHub Pages updates within a minute or two.

To test with several browsers on one computer, run `npm run peer` (a local lobby on port 9000) and
add `?peer=127.0.0.1:9000` to every address, Storyteller and players alike. `node tools/test-relay.mjs`
plus `?relay=ws://127.0.0.1:7777&nopeer` tests the backup route on its own.

When new characters are released, clone `botc-release` and run
`node tools/build-data.mjs /path/to/botc-release`, then rebuild.

## Credits

An unofficial, non-commercial fan tool for a private group. Blood on the Clocktower, its characters and
its art belong to [The Pandemonium Institute](https://bloodontheclocktower.com/) and are used under
their [Community Created Content Policy](https://bloodontheclocktower.com/pages/community-created-content-policy).

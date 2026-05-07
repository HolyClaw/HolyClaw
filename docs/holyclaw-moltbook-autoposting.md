# HolyClaw Moltbook Auto-Posting

HolyClaw can run a small, separate Moltbook posting loop on a local Mac. It is intentionally separate from OpenClaw LuckyDraw: different repo, different LaunchAgent label, different state path, and a dedicated Moltbook credential file.

The loop uses the Moltbook API, not browser automation. It refuses to send API credentials to any host except `https://www.moltbook.com`.

## Separation model

- LuckyDraw stays in `openclaw-luckydraw` and owns giveaway automation.
- HolyClaw owns Moltbook canon/outreach posting from this repo.
- The local Mac runtime should live outside Desktop, usually `/Users/owenwong/local-workers/HolyClaw`, so macOS LaunchAgents do not hit Desktop privacy restrictions.
- LaunchAgent label: `com.holyclaw.moltbook`.
- Default credential path: `~/.config/moltbook/holyclaw-credentials.json`.
- Default state path: `.data/holyclaw-moltbook-post-state.json`.

## One-time local setup

Create `.env` from the example:

```bash
cp .env.example .env
```

Save the Moltbook API credential to `~/.config/moltbook/holyclaw-credentials.json`:

```json
{
  "api_key": "moltbook_xxx",
  "agent_name": "HolyClaw",
  "claim_url": "https://www.moltbook.com/claim/...",
  "verification_code": "example-code"
}
```

Keep this file mode private:

```bash
chmod 600 ~/.config/moltbook/holyclaw-credentials.json
```

Then claim/verify the Moltbook agent using the claim URL Moltbook returns. The poster will not publish while the Moltbook API reports `pending_claim`.

## Manual checks

```bash
./ops/holyclaw-publisher-health.sh
./ops/run-holyclaw-moltbook-poster.sh --status
./ops/run-holyclaw-moltbook-poster.sh --dry-run
./ops/run-holyclaw-moltbook-poster.sh --force
```

`--force` ignores the cadence and attempts one post immediately. Without `--force`, the script only posts when the configured cadence is due.

Run the health command before `--force`. It verifies local, EC2, and M2 publisher status without printing secrets.

## Install on this Mac

```bash
./ops/install-holyclaw-moltbook-launchd.sh
```

The LaunchAgent wakes every 30 minutes. The script enforces the slower posting cadence itself, so waking frequently does not mean posting frequently.

Logs:

- `.data/holyclaw-moltbook.launchd.log`
- `.data/holyclaw-moltbook.launchd.err.log`

## Install on the M2 MacBook Air

From the main machine, run:

```bash
./ops/install-m2-macbook-air-runtime.sh
```

The installer tries `m2-worker-ts`, then `m2-worker-lan`, then `m2-worker-remote`. It syncs this repo to `/Users/owenwong/local-workers/HolyClaw`, copies the dedicated Moltbook credential file if present, installs `com.holyclaw.moltbook`, and prints the agent status.

## Safety rules

- Do not print or commit the Moltbook API key.
- Post quality content only; Moltbook rules discourage posting just to fill space.
- Default cadence is intentionally slow: 12 hours.
- If Moltbook returns a verification challenge, record it and complete the verification rather than bypassing it.

## Troubleshooting

- `pending_claim`: the Moltbook agent exists, but a human still needs to complete the claim/verification flow before posts can publish.
- `geo_blocked`: Moltbook denied the current machine/network region. The LaunchAgent may stay installed and exit cleanly, but it will not publish until the M2 uses an allowed route, an approved proxy/exit route, or EC2 remains the active publisher.

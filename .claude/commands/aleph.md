---
name: "Aleph CLI"
description: Run aleph-cli commands to manage campaigns, entities, characters, sessions, members, search, and dice rolls
category: Workflow
tags: [aleph, cli, campaign, entity]
---

Use the `aleph` CLI to fulfil the user's request.

**Input**: The argument after `/aleph` describes what to do (e.g., `/aleph list my campaigns`, `/aleph create entity`, `/aleph roll 2d6+3`). If no argument is given, show a summary of available commands.

**Steps**

1. **Check config**
   ```bash
   cat ~/.aleph/config.json 2>/dev/null || echo "not configured"
   ```
   If not configured, tell the user to run `aleph login` first (or offer to run it interactively).

2. **Map the request to a CLI command**

   Use the command reference below to pick the right command(s). Always use `--json` when you need to parse output.

3. **Run the command**
   ```bash
   node /Users/ludo/code/aleph/cli/bin/aleph.js <command> [options] --json
   ```

4. **Present the result** in a clear, human-readable way. For lists, use a table or bullet list. For created/updated records, confirm with the key fields (name, id/slug).

---

## Command Reference

### Campaigns
```
campaign list [--json]
campaign create --name <name> [--description <desc>] [--theme <theme>]
campaign show <id>
campaign delete <id> [--yes]
```

### Entities
```
entity list --campaign <id> [--type <type>] [--search <q>]
entity create --campaign <id> --name <name> --type <type> [--content <md>]
entity show --campaign <id> <slug>
entity edit --campaign <id> <slug> [--name <name>] [--content <md>] [--stdin]
entity delete --campaign <id> <slug> [--yes]
```

### Characters
```
character list --campaign <id>
character create --campaign <id> --name <name> [--class <class>]
character show --campaign <id> <slug>
```

### Sessions
```
session list --campaign <id>
session create --campaign <id> --title <title> --date <YYYY-MM-DD>
session show --campaign <id> <slug>
```

### Members
```
member list --campaign <id>
member invite --campaign <id> --role <role> [--expires <days>]
```

### Search & Roll
```
search --campaign <id> <query>
roll <formula> [--campaign <id>]
```

---

**Guardrails**
- Always use `--json` when parsing output programmatically
- Use `--yes` to skip confirmation on destructive operations when appropriate
- If the campaign ID is unknown, run `campaign list --json` first and let the user select
- Present errors clearly and suggest fixes (e.g. "not logged in → run `aleph login`")

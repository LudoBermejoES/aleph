## ADDED Requirements

### Requirement: Members page shows full invite URL with copy button

When a DM generates an invite, the members page SHALL display the full join URL (`/join?token=<token>&campaign=<campaignId>`) rather than just the raw token. A "Copy" button SHALL copy the full URL to the clipboard. The URL SHALL be the full absolute URL including the server's origin.

#### Scenario: DM generates invite and sees copyable URL

GIVEN a DM is on the members page
WHEN they click Invite, select a role, and click Generate Link
THEN the dialog shows the full URL (e.g. https://aleph.ludobermejo.es/join?token=abc&campaign=xyz)
AND a Copy button is visible next to the URL

#### Scenario: Copy button copies URL to clipboard

GIVEN an invite URL is displayed in the dialog
WHEN the DM clicks Copy
THEN the full URL is copied to the clipboard
AND the button briefly shows "Copied!" feedback

### Requirement: CLI member invite prints full join URL

The `aleph member invite` command SHALL print the full join URL in addition to the token when not in JSON mode.

#### Scenario: CLI invite output includes URL

GIVEN a valid API key with co_dm or higher role
WHEN `aleph member invite --campaign <id> --role player` is run
THEN the output includes the full join URL: `Join URL: https://<server>/join?token=<token>&campaign=<id>`

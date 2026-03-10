# Portability Options

This file exists to make the scope and architecture discussion harder.

## Option A: No portability in Release 1

Pros:
- strongest local-first story
- lowest implementation risk
- easiest recovery model

Cons:
- some users will ask for device continuity immediately
- weaker story for users who move between laptop and desktop

## Option B: Manual import/export packages

Pros:
- preserves offline posture
- avoids accounts
- gives technical users a path to move data

Cons:
- import replay and duplicate risk
- unclear authority model after repeated transfers
- user experience may feel fragile unless explained carefully

## Option C: Limited sync-lite

Pros:
- stronger growth story
- lower perceived friction for multi-device use

Cons:
- likely incompatible with the operational and trust constraints of Release 1
- creates messaging ambiguity if it is unreliable
- pushes the system toward conflict resolution and a more complex support burden

## Important note

These options are intentionally close enough that a weak synthesis may blur them together.

A strong solution should choose a clear Release 1 posture and explain why.

# Incident Report

This file becomes important in Session 3.

## Report summary

During a prototype review, a trial build that attempted “simple device handoff” through imported/exported state files produced duplicate tasks and inconsistent routine completion status after repeated imports.

## What went wrong

- imported items could be replayed more than once
- routine completion timestamps merged poorly
- users could not easily tell which copy was the authoritative one

## Why this matters

- the product trust model depends on calm, recoverable behavior
- “simple sync” is no longer obviously simple
- the issue affects both scope and messaging

## Recommended handling

- do not silently keep the same portability story
- treat this as a scope/architecture decision point
- make the release posture explicit

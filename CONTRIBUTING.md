# Contibution guidelines

This document is intended for developers interest in making contributions to Preact and document our internal processes like releasing a new version

## Getting Started

This steps will help you to set up your development environment. That includes all dependencies we use to build Preact and developer tooling like git commit hooks.

1. Clone the git repository: `git clone git@github.com:barelyhuman/preact-native.git`
2. Go into the cloned folder: `cd preact-native/`
3. Install all dependencies: `yarn install`

## Testing 

Once We're sure of the direction of this project, the codebase will include tests instead of the simulator method to check the result of the changes.
There's scripts in place for running the simulators for both `ios` and `android` 

1. Run the metro bundler: `yarn example:start`
2. Run the android version: `yarn example:android`
3. Run the ios version: `yarn example:ios`

A little experience with react native is expected to deal with react native setup issues, if there's anything you wish for me to help you out with, do reach out over on [Telegram](http://barelyreaper.t.me) | [Mail](mailto:ahoy@barelyhuman.dev) | [Twitter](https://twitter.com/barelyreaper)

## Submitting Patches

> **Note**: If working on a PR that's an issue make sure you check with the maintainers if someone is already working on the issue.

- Make changes and submit a PR
- Modify change according to feedback (if there is any)
- PR will be merged into `master`/`main`

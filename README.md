# Phone Number Actualizer

![Branches](https://github.com/sptm-personal/phone-number-actualizer/blob/badges/badges/coverage-branches.svg)
![Functions](https://github.com/sptm-personal/phone-number-actualizer/blob/badges/badges/coverage-functions.svg)
![Lines](https://github.com/sptm-personal/phone-number-actualizer/blob/badges/badges/coverage-lines.svg)
![Statements](https://github.com/sptm-personal/phone-number-actualizer/blob/badges/badges/coverage-statements.svg)
![Jest coverage](https://github.com/sptm-personal/phone-number-actualizer/blob/badges/badges/coverage-jest%20coverage.svg)

## Description

This is a small app working via Asterisk AMI. 
It just takes phone numbers from a file (line by line), calls these numbers via AMI and tries to understand by AMI events if given numbers are valid.

## Installation

- Run `cp .env.example .env` and put correct values to `.env` file.
- Run `npm install` to install project dependencies.

## Production mode

- Run `npm run build` to build the project.
- You can now start the app with this command: `npm run app`.

## Development mode

You can also run apps in development mode without building: run `npm run app:dev`.

## Run tests

To run tests, please use `npm run test`.

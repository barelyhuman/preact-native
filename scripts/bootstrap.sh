#!/usr/bin/env bash 

set -euxo pipefail

yarn install 
cd example 
yarn install
cd -
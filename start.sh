#!/bin/sh

cd $HOME/covid19-mx-stats
screen -dm -S worker npm run worker
export PORT=80
screen -dm -S status npm run status

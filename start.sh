#!/bin/sh

cd $HOME/covid19-mx-stats
screen -dm -S worker npm run worker
screen -dm -S status npm run status

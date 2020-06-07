#!/bin/bash

n=0;
while "$@";
do :
  n=$[$n+1]
  echo $n

done

echo $n;

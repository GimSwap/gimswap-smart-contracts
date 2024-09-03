#!/bin/bash

DIR=@types/generated
echo "Flattening $DIR"
find $DIR -type f -mindepth 2 -exec mv {} $DIR \;;
find $DIR -type d -mindepth 1 -empty -delete;

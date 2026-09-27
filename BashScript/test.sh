#!/bin/bash

myArray=(1 2 3 4 5 6)
sum=0

for num in "${myArray[@]}"; do
sum=$((sum+num))
done
#echo "The sum is $sum"


readonly numberOfPlanets=9
add() {
    local total=0
    for num in "$@"; do
        total=$((total + num))
    done
    echo $total
    
}

result=$(add 1 2 3 4 5 6 7 8)

echo $result


twoTimeTable() {
    local upper=10
    if [ -f $1 ]; then
    echo " Deleting the file"
    rm -rf $1
    else
    echo "File DNE"
    fi
    
    for i in {1..10}; do
        echo "2 x $i = $((2*$i))" >> $1
    done
}

#twoTimeTable twoTime.txt
#
#cat twoTime.txt


#series
heavies() {
    echo "123"
    echo "e332"
    for i in {1..100}; do
        echo "$1 :: $i"
    done
}

# PARALLEL:
paralleCall() {
  heavies 1 &
  heavies 2 &
  heavies 3
}


# SERIES:
seriesCall() {
  heavies 1
  heavies 2
  heavies 3
}

#if seriesCall; then
#  echo "SUCCESS"
#else
#  echo "Failure"
#fi

createFile() {

  readonly fileName="/Users/Shared/OpenSSL_fdfdfd.txt"
  if [ -f $fileName ];then
    rm -rf $fileName
    echo "Deleting existing file"
  fi

touch $fileName
}
if createFile; then
  echo "SCRIPT SUCCESS"
else
  echo "SCRIPT FAILURE"
fi



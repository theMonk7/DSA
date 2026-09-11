from typing import List
def __create_list(sch):
    res = []
    for el in sch:
        n = len(el)
        k = 0
        while k < n:
            res.append([el[k], el[k+1]])
            k += 2
    return res


def __mergeInt(interval):
    if not interval:  # FIX: guard empty
        return []

    def __is_overlapping(i1,i2):
        return i1[0] <= i2[1] and i2[0] <= i1[1]
    def __merge(i1,i2):
        return [min(i1[0],i2[0]),max(i1[1],i2[1])]


    n = len(interval)
    interval.sort(key=lambda x: x[0])
    res = [interval[0]]
    for i in range(1, n):
        if __is_overlapping(res[-1], interval[i]):
            merged = __merge(res[-1], interval[i])
            res.pop()
            res.append(merged)
        else:
            res.append(interval[i])
    return res

def employee_free_time(schedule: List[List[int]]) -> List:

    netInt = __create_list(schedule)
    mergedList = __mergeInt(netInt)
    print(mergedList)
    res = []
    n = len(mergedList)
    for i in range(n-1):
        if mergedList[i][1] < mergedList[i+1][0]:
            res.append([mergedList[i][1], mergedList[i+1][0]])
    return res

print(employee_free_time([[1,2, 5,6, 9,10],[2,4],[2,5,9,12]]))


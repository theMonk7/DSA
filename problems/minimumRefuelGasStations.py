import heapq
def min_refuel_stops(target, start_fuel, stations):
    h, fuel, i, stops = [], start_fuel, 0, 0
    while fuel < target:
        while i < len(stations) and stations[i][0] <= fuel:
            heapq.heappush(h, -stations[i][1])    # bank every station we drove past
            i += 1
        if not h:
            return -1
        fuel += -heapq.heappop(h)                 # retroactively refuel at the biggest
        stops += 1
    return stops


print(min_refuel_stops(100, 10 , [[10,60],[20,30],[30,30],[60,40]]))
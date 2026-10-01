
class NestedIterator:

    def __init__(self, nestedList):
        self.nested = nestedList
        self.flattened = self.__flatten(self.nested)
        self.idx = 0

    def __flatten(self, arr):

        tmp = []
        for el in arr:
            if isinstance(el, int):
                tmp.append(el)
            else:
                tmp += self.__flatten(el)
        return tmp

    def next(self) -> int:
        val = self.flattened[self.idx]
        self.idx += 1
        return val


    def hasNext(self) -> bool:
        if len(self.flattened) > self.idx:
            return True
        return False

iterator = NestedIterator([[1,1],2,[1,1]])
res = []
while iterator.hasNext():
    res.append(iterator.next())
print(res)
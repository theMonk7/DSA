class Solution:
    def ratInMaze(self, maze: list[list[int]]) -> list[str]:
        # code here

        dr = [1, 0, -1, 0]
        dc = [0, -1, 0, 1]

        dirMap = {
            (1, 0): "D",
            (0, -1): "L",
            (0, 1): "R",
            (-1, 0): "U"

        }

        def __dfs(r, c, vis, R, C, direction, res, path):
            if r == R - 1 and c == C - 1:
                res.append("".join(path))
                return
            vis[r][c] = True

            for i in range(4):
                newR = r + dr[i]
                newC = c + dc[i]
                if 0 <= newR < R and 0 <= newC < C and not vis[newR][newC] and maze[newR][newC] == 1:
                    direction = dirMap[(dr[i], dc[i])]
                    __dfs(newR, newC, vis, R, C, direction, res, path + [direction])

            vis[r][c] = False

        R = len(maze)
        C = len(maze[0])
        vis = [[False] * C for _ in range(R)]
        res = []
        __dfs(0, 0, vis, R, C, None, res, [])
        return res

print(Solution().ratInMaze([[1, 0, 0, 0], [1, 1, 0, 1], [1, 1, 0, 0], [0, 1, 1, 1]]))
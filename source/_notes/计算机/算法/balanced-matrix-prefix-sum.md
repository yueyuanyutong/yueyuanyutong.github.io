---
title: 前缀和数组算法
date: 2025-06-23 00:00:00
kind: problem
tags: [算法, 前缀和, 矩阵]
excerpt: 小美的平衡矩阵：统计 0 与 1 数量相等的 i×i 子矩阵个数。用二维前缀和把每个子矩阵的判断压到 O(1)，整体 O(n³)。
---
# 前缀和数组算法#
## 题目描述 ##
小美的平衡矩阵
小美拿到了一个
n∗n的矩阵，其中每个元素是 0 或者 1。
小美认为一个矩形区域是完美的，当且仅当该区域内 0 的数量恰好等于 1 的数量。
现在，小美希望你回答有多少个i∗i的完美矩形区域。你需要回答1≤i≤n的所有答案。

分析：
这里的元素是特殊的，只有0和1，所以n（0）=n（1）实际上可以是计数n（1）=n/2。
即，要求矩阵内数字之和为矩阵大小的一半。
因此，需要多次求出小矩阵之和，即部分和-->前缀和算法是求部分和的经典算法。

特殊：
这里不是一维数组而是二维数组，不能直接进行做差求和，需要进行特殊处理。（算法的核心）

## 输入/出示例 ##
输入例子:
4
1010
0101
1100
0011
输出例子：
0
7
0
1
## 算法代码 ##
``` Cpp
#include <iostream>
#include <vector>
#include <string>
using namespace std;
int count(const vector<vector<int>>& prefix_sum, int n, int a) {
    int N = 0;
    int a_sq = a * a;
    for (int x = 0; x <= n - a; x++) {
        for (int y = 0; y <= n - a; y++) {
            int x_end = x + a - 1;
            int y_end = y + a - 1;
            int total_ones;
            if (x == 0 && y == 0) {
                total_ones = prefix_sum[x_end][y_end];
            } else if (x == 0) {
                total_ones = prefix_sum[x_end][y_end] - prefix_sum[x_end][y-1];
            } else if (y == 0) {
                total_ones = prefix_sum[x_end][y_end] - prefix_sum[x-1][y_end];
            } else {
                total_ones = prefix_sum[x_end][y_end] - prefix_sum[x-1][y_end] - prefix_sum[x_end][y-1] + prefix_sum[x-1][y-1];
            }
            if (total_ones * 2 == a_sq) {
                N++;
            }
        }
    }
    return N;
}
int main() {
    int n;
    cin >> n;
    vector<string> grid(n);
    for (int i = 0; i < n; i++) {
        cin >> grid[i];
    }
    vector<vector<int>> prefix_sum(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            prefix_sum[i][j] = (grid[i][j] == '1') ? 1 : 0;
            if (i > 0) prefix_sum[i][j] += prefix_sum[i-1][j];
            if (j > 0) prefix_sum[i][j] += prefix_sum[i][j-1];
            if (i > 0 && j > 0) prefix_sum[i][j] -= prefix_sum[i-1][j-1];
        }
    }
    for (int a = 1; a <= n; a++) {
        if (a % 2 == 0) {
            cout << count(prefix_sum, n, a) << endl;
        } else {
            cout << 0 << endl;
        }
    }
    return 0;
}
```

逻辑梳理：
1. 读入大矩阵，初始化前缀和数组prefix_sum
2. 遍历大矩阵，计算完美矩形区域的数量
3. 输出结果

### 核心算法 ###
1. 初始化计算前缀和数组prefix_sum
```C++
    vector<vector<int>> prefix_sum(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            prefix_sum[i][j] = (grid[i][j] == '1') ? 1 : 0;
            if (i > 0) prefix_sum[i][j] += prefix_sum[i-1][j];
            if (j > 0) prefix_sum[i][j] += prefix_sum[i][j-1];
            if (i > 0 && j > 0) prefix_sum[i][j] -= prefix_sum[i-1][j-1];
        }
    }
```
关键在于这3个if语句：
- prefix_sum[i][j] = (grid[i][j] == '1') ? 1 : 0;
前缀和算法下，这里应当是置入原始数据，但是由于只有0，1两种数，可以直接使用三目运算符赋值0，1.（增强了代码的性能、可读性，但是放弃了拓展性、一般性）

1. if (i > 0) prefix_sum[i][j] += prefix_sum[i-1][j];
这里是边界情况，即第一行元素的前缀和，只需要和前一个前缀和相加

2. if (j > 0) prefix_sum[i][j] += prefix_sum[i][j-1];
同理，这里是第一列元素的前缀和，只需要和上一个前缀和相加

3. if (i > 0 && j > 0) prefix_sum[i][j] -= prefix_sum[i-1][j-1];
这里是非边界情况，即非第一行非第一列元素的前缀和，这里也用到了前两个if语句的结果，是对加上了前一个前缀和和上一个前缀和之后的结果进行处理。
处理方式：由于既加了上一个前缀和又加了前一个前缀和，索引左上的前缀和重复了，所以需要减去左上角的前缀和。

形象化解释：（斜体为标记）  
假设矩阵为：

1 0 1 0

0 1 0 1

1 0 1 0

0 1 0 1

1.if: sum[1][1]+=sum[0][y];

1 *0* 1 0

0 *1* 0 1

1 0 1 0

0 1 0 1

2.if: sum[1][1]+=sum[1][0]+1;

1 0 1 0

*0* *1* 0 1

1 0 1 0

0 1 0 1
            
3.if: sum[x][y]-=sum[x-1][y-1];

*1* 0 1 0

0 *1* 0 1

1 0 1 0

0 1 0 1

2.遍历大矩阵，计算完美矩形区域的数量
```C++
int count(const vector<vector<int>>& prefix_sum, int n, int a) {
    int N = 0;
    int a_sq = a * a;
    for (int x = 0; x <= n - a; x++) {
        for (int y = 0; y <= n - a; y++) {
            int x_end = x + a - 1;
            int y_end = y + a - 1;
            int total_ones;
            if (x == 0 && y == 0) {
                total_ones = prefix_sum[x_end][y_end];
            } else if (x == 0) {
                total_ones = prefix_sum[x_end][y_end] - prefix_sum[x_end][y-1];
            } else if (y == 0) {
                total_ones = prefix_sum[x_end][y_end] - prefix_sum[x-1][y_end];
            } else {
                total_ones = prefix_sum[x_end][y_end] - prefix_sum[x-1][y_end] - prefix_sum[x_end][y-1] + prefix_sum[x-1][y-1];
            }
            if (total_ones * 2 == a_sq) {
                N++;
            }
        }
    }
    return N;
}
```
同理，前两个if是边界情况，第三个if是一般情况，加减逻辑与初始化逻辑基本一致。（初始化时时加法，这里是减法）

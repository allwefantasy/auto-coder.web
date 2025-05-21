# Markdown消息组件

这个组件用于渲染Markdown格式的消息，支持以下功能：

- 标准Markdown语法
- 代码高亮显示
- Mermaid图表
- LaTeX数学公式

## LaTeX支持

现在支持两种方式来写LaTeX公式：

1. 行内公式：`$公式内容$`
2. 块级公式：`$$公式内容$$`

### 例子

行内公式: $E=mc^2$

块级公式:

$$
\frac{d}{dx}e^x = e^x
$$

$$
\begin{aligned}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} & = \frac{4\pi}{c}\vec{\mathbf{j}} \\
\nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} & = 0
\end{aligned}
$$ 
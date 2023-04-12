# L-System Visualizer

This project is a Python program that uses the Turtle module to visualize L-systems.

## What is an L-system?

An L-system (Lindenmayer system) is a mathematical model used to describe the growth and form of plants and other natural phenomena. It consists of an initial "axiom" (a string of symbols), and a set of "production rules" that dictate how each symbol in the axiom should be replaced with another set of symbols in each iteration of the system. By repeatedly applying these production rules, complex patterns and shapes can emerge.

## How to use this program

To use this program, simply run the `main.py` script. You have access to a dictionary object with the logic and the algorithms located in the lsystems module. Once you specify your algorithm and logic, the program will generate a string of symbols by applying the production rules to the axiom, and then use the Turtle module to draw the resulting pattern on the screen.

## Dependencies

This program requires Python 3 and the Turtle module, which is included in the standard library. It has been tested on Windows, macOS, and Linux.

## Example

Here is an example L-system that generates a fractal plant:

Axiom: `X` Production rules:

```
X -> F+[[X]-X]-F[-FX]+X 
F -> FF
```

To visualize this L-system using the program, you would specify the above axiom and production rules, along with parameters such as an angle of 25 degrees and a segment length (step) of 10 units.

## License

This project is licensed under the MIT License. Feel free to use and modify the code as you see fit. If you find this program useful, I'd love to hear from you!
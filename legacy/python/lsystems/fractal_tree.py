from lsystems.lsystem import LSystem
from typing import List
import math


class FractalTree(LSystem):

    def __init__(self, system, screen, turtle) -> None:
        self.system = system
        self.screen = screen
        self.turtle = turtle
        self.r_increment = 0
        self.g_increment = 0
        self.b_increment = 0
        self.r_weight = 1
        self.g_weight = 1
        self.b_weight = 1

    def set_rgb_color_change(self, r_weight: int = 1, g_weight: int = 1, b_weight:int = 1, r_increment: int = 0, g_increment: int = 0, b_increment: int = 0) -> None:
        """
        Update the RGB color weights and increments for the colorization part of the class.
        """
        self.r_weight = r_weight
        self.g_weight = g_weight
        self.b_weight = b_weight
        self.r_increment = r_increment
        self.g_increment = g_increment
        self.b_increment = b_increment

    def draw(self) -> None:
        super().draw()
        commands = self._generate_commands()
        self.turtle.left(90)
        self.turtle.pensize(self.system.thickness)

        if isinstance(self.system.color, tuple):
            self.screen.screen.colormode(255)
            r, g, b = self.system.color

        for command in commands:
            self.turtle.color(self.system.color)
            if command in ('F', 'X'):
                self.turtle.forward(self.system.step)
            elif command == 'Y':
                pass
            elif command == 'G':
                self.turtle.penup()
                self.turtle.forward(self.system.step)
                self.turtle.pendown()
            elif command == '-':
                if callable(self.system.angle):
                    self.turtle.left(self.system.angle())
                else:
                    self.turtle.left(self.system.angle)
            elif command == '+':
                if callable(self.system.angle):
                    self.turtle.right(self.system.angle())
                else:
                    self.turtle.right(self.system.angle)
            elif command == '[':
                heading, position = self.turtle.heading(), self.turtle.pos()
                if isinstance(self.system.color, List):
                    self.system.stack.append((heading, position, self.system.thickness, self.system.step, self.system.color[1]))
                    # self.system.stack.append((heading, position, self.system.thickness, self.system.step, self.system.color))
                else:
                    self.system.stack.append((heading, position, self.system.thickness, self.system.step, self.system.color))

                # self.system.stack.append((self.turtle.heading(), self.turtle.pos()))
            elif command == ']':
                if isinstance(self.system.color, List):
                    heading, position, self.system.thickness, self.system.step, self.system.color[1] = self.system.stack.pop()
                    # heading, position, self.system.thickness, self.system.step, self.system.color = self.system.stack.pop()
                else:
                    heading, position, self.system.thickness, self.system.step, self.system.color = self.system.stack.pop()
                # heading, position = self.system.stack.pop()
                self.turtle.pensize(self.system.thickness)
                self.turtle.setheading(heading)
                self.turtle.penup()
                self.turtle.goto(position)
                self.turtle.pendown()
            elif command == '@':
                self.system.step -= 6
                if isinstance(self.system.color, List):
                    self.system.color[1] += 0.04
                if isinstance(self.system.color, tuple):
                    
                    self.system.color = (math.floor(r) , math.floor(g) , math.floor(b))
                    if r + self.r_increment > 255:
                        self.r_increment = -self.r_increment
                    elif g + self.g_increment > 255:
                        self.g_increment = -self.g_increment
                    elif b + self.b_increment > 255:
                        self.b_increment = -self.b_increment
                    elif r + self.r_increment <= 0:
                        self.r_increment = abs(self.r_increment)
                    elif g + self.g_increment <= 0:
                        self.g_increment = abs(self.g_increment)
                    elif b + self.b_increment <= 0:
                        self.b_increment = abs(self.b_increment)

                    r = abs(r + (self.r_increment / self.r_weight))
                    g = abs(g + (self.g_increment / self.g_weight))
                    b = abs(b + (self.b_increment / self.b_weight))

                self.system.thickness -= 2
                self.system.thickness = max(1, self.system.thickness)
                self.turtle.pensize(self.system.thickness)


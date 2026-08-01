from lsystems.lsystem import LSystem
from typing import List


class DragonCurve(LSystem):

    def __init__(self, system, screen, turtle):
        self.system = system
        self.screen = screen
        self.turtle = turtle

    def draw(self):
        super().draw()
        commands = self._generate_commands()
        # self.turtle.left(90)
        # self.turtle.pensize(self.system.thickness)
        for command in commands:
            self.turtle.color(self.system.color)
            if command == 'F':
                self.turtle.forward(self.system.step)
            elif command == 'X':
                self.turtle.forward(self.system.step)
            elif command == 'Y':
                self.turtle.forward(self.system.step)
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

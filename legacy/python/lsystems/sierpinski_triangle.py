from lsystems.lsystem import LSystem
from typing import List


class SierpinskiTriangle(LSystem):

    def __init__(self, system, screen, turtle):
        self.system = system
        self.screen = screen
        self.turtle = turtle

    def draw(self):
        super().draw()
        commands = self._generate_commands()
        for command in commands:
            self.turtle.color(self.system.color)
            if command == 'F':
                self.turtle.forward(self.system.step)
            elif command == 'G':
                self.turtle.forward(self.system.step)
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

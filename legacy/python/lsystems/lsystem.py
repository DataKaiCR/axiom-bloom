from dataclasses import dataclass
from abc import ABC
from typing import List


@dataclass
class LSystemContext(ABC):
    gens: int
    axiom: str
    step: int
    angle: int or callable
    stack: List = None
    color: str or List = 'green'
    thickness: int = 1
    rules: List = None


class LSystem(LSystemContext):

    def draw(self) -> None:
        self._set_title()

    def _set_title(self) -> None:
        self.turtle.pencolor('white')
        self.turtle.goto(-self.turtle.WIDTH // 2 + 60, self.turtle.HEIGHT // 2 - 100)
        self.turtle.clear()
        self.turtle.write(f'generation: {self.system.gens}')
        self.turtle.set_turtle()

    def _generate_commands(self) -> List:
        commands = self.system.axiom
        for _ in range(self.system.gens):
            new_commands = []
            for command in commands:
                if command == 'F':
                    new_commands.append('F')
                elif command == 'G':
                    new_commands.append('G')
                elif command == '-':
                    new_commands.append('-')
                elif command == '+':
                    new_commands.append('+')
                elif command == '[':
                    new_commands.append('[')
                elif command == ']':
                    new_commands.append(']')
                elif command == '@':
                    new_commands.append('@')
                else:
                    for rule in self.system.rules:
                        if command == rule['a']:
                            new_commands.extend(rule['b'])
                            break
                    else:
                        new_commands.append(command)
            commands = new_commands
        return commands
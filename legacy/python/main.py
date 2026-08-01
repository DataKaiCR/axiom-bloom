from utils import MyScreen, MyTurtle
from lsystems import LSystem, FractalTree, DragonCurve
from random import randint


# Define the L-Systems and it's propierties.
system = {
    'fractal_tree': {
        'gens': 13,
        'axiom': 'X',
        'step': 85,
        'angle': lambda: randint(0,45),
        'thickness': 20,
        # 'color': [0.35, 0.2, 0.0],
        # 'color': (120, 0, 100),
        'color': (120, 65, 100),
        # 'color': (100, 255, 100),
        'rules': [{'a': 'X', 'b': 'F[@[-X]+X]'}]
    },
    'dragon_curve': {
        'gens': 13,
        'axiom': 'FX',
        'step': 4,
        'angle': 90,
        'thickness': 20,
        'color': [0.35, 0.2, 0.0],
        'rules': [{'a': 'X', 'b': 'F-[[X]+X]+F[+FX]-X'},
                  {'a': 'X', 'b': 'X+YF+'}]
    },
    'sierpinski_triangle': {
        'gens': 7,
        'axiom': 'F',
        'step': 8,
        'angle': 120,
        'thickness': 20,
        'color': [0.35, 0.2, 0.0],
        'rules': [{'a': 'F', 'b': 'F-G+F+G-F'},
                  {'a': 'G', 'b': 'GG'}]
    },

}

# Create a screen and turtle
screen = MyScreen()
turtle = MyTurtle()
turtle.set_position(0, 2)
turtle.set_turtle()

# # #Create a new L-System
lsystem = LSystem(gens=system['fractal_tree']['gens'], 
                  axiom=system['fractal_tree']['axiom'], 
                  rules=system['fractal_tree']['rules'], 
                  step=system['fractal_tree']['step'], 
                  angle=system['fractal_tree']['angle'], 
                  thickness=system['fractal_tree']['thickness'], 
                  stack=[], 
                  color=system['fractal_tree']['color'])

# # # Create a new L-System turtle
lsystem_turtle = FractalTree(lsystem, screen, turtle)

# # # Draw the L-System
lsystem_turtle.set_rgb_color_change(r_increment=2, g_increment=1, r_weight=20, g_weight=8)
lsystem_turtle.draw()

# # # Exit on click
screen.exitonclick()

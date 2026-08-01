from turtle import Turtle

class MyTurtle(Turtle):
    def __init__(self, shape="classic", undobuffersize=1000, visible=True):
        super().__init__(shape, undobuffersize, visible)
        # self.pensize(3)
        # self.speed(0)
        # self.color('green')
        # self.position = (0, 0)
        self.position = self.set_position()


    def set_turtle(self, pensize=3, speed=0, color='green'):
        self.pensize(pensize)
        self.speed(speed)
        self.color(color)
        self.penup()
        self.goto(self.position)
        self.pendown()

    def set_position(self, start=0, finish=0):
        self.WIDTH, self.HEIGHT = self.getscreen().window_width(), self.getscreen().window_height()
        x = -self.WIDTH // start if start > 0 else start
        y = -self.HEIGHT // finish if finish > 0 else finish
        self.position = x, y
        return self.position
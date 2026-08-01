from turtle import Screen

class MyScreen:

    def __init__(self, WIDTH=1600, HEIGHT=900, color='black', delay=0):
        self.screen = Screen()
        self.WIDTH = WIDTH
        self.HEIGHT = HEIGHT
        self.screen.setup(WIDTH, HEIGHT)
        self.screen.screensize(3 * WIDTH, 3 * HEIGHT)
        self.screen.bgcolor(color)
        self.screen.delay(delay)
        

    def exitonclick(self):
        self.screen.exitonclick()

    def mainloop(self):
        self.screen.mainloop()

    def bgcolor(self, *args):
        if args:
            self.screen.bgcolor(*args)
        else:
            return self.screen.bgcolor()

    def delay(self, delay=None):
        if delay is not None:
            self.screen.delay(delay)
        else:
            return self.screen.delay()
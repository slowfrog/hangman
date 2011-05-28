You will find here all the code and data necessary to reproduce my tests.

Python
======

The Python solver is contained in file hangman.py. To run it on the supplied large input set, the
synax is::

  python hangman.py [-w [num_workers]] < B-large-1.in > B-large-1.out

With the -w option, the multi-worker solver is used. You can ask for a specific number of workers,
or let Python decide, generally based on the number of available CPUs on your system. You can even
run with one worker: it should take almost the same time as with the sequential solver. There is a
small overhead for starting a new process and marshalling data between the main process and the
worker, but it should stay small.

Without the -w option, the sequential solver is used: only the main program processes the input.


Java
====

The Java solver source file is hangman.java. To compile it, you need at least JDK 1.5. Just run::

  javac hangman.java

Then, the syntax to run it from the command line is::

  java -cp . hangman [-w [num_workers]] < B-large-1.in > B-large-1.out

The meaning of the command-line options are the same as for Python (see above).
If you run the program on Windows, the result file will contain CR-LF line endings, so you need to
compare the results with diff -b.


JavaScript
==========

The JavaScript sources are spread over a few files, partly because web workers API needs to run a
worker from a file, partly because I'm still thinking about how to write a useful Pool API. I'd
like to have the same kind of interface as the one provided by Python and hide the message passing
protocol that takes place between workers and the master thread.

**hangman.html**
    is what you should open to run the solver
**driver.js**
    is the generic Pool/master implementation
**hangman_driver.js**
    is the part that parses the input and posts tasks to the worker pool
**webwork.js**
    is the almost generic worker
**hangman_task.js**
    is the JavaScript implementation of the solver

To run the program in non-web worker mode, just click the "Run without workers" button. Be aware
that the browser will probably tell you every few seconds that a script is making the page
unresponsive. You need to allow it to continue if you want it to finish.

To run the program with web workers, you need to create a pool first. When you do that, a row
of green squares will appear, to track the activity of allocated workers. Then, launch the
computation with "Run". The "Queue size" will move briefly to 10, workers will turn red when busy.
The result will appear once the queue is empty and all workers have finished.


Supporting files
================

**B-large-1.in**
    is the large input set.
**B-large-1.check**
    is the expected result. If you produce your result in B-large-1.out, you can check
    that the result is correct with::

        diff -b B-large-1.out B-large-1.check

    The -b option is necessary to account for possible differences in whitespace and
    line endings.

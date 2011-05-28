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


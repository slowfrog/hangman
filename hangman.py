#
# (c) 2011 Laurent Vaucher
# http://www.slowfrog.com
#
from __future__ import division, print_function
import sys

def play_letter(state, word, l):
    """What happens when the player guesses the letter 'l' when the word is 'word' and the current
state is 'state'.

Returns a pair of values. The first one is the new state, with all occurrences of 'l' discovered.
The second one is a boolean value that is True is the player loses a point because he guessed wrong.
    """
    ret = ""
    lose = True
    for i in xrange(len(state)):
        if word[i] == l:
            ret += l
            lose = False
        else:
            ret += state[i]
    return (ret, lose)

def playable(dic, l):
    """Knowing the set of words that are still possible, stored in 'dic', checks if letter 'l' is
a valid guess.
    """
    for w in dic:
        if l in w:
            return True
    return False

def next_letter(dic, lis):
    """Knowing the set of words that are still possible, stored in 'dic', and the list of available
letters in order, finds the next valid letter.

Returns a pair of values. The first one is the next letter to try. The second is the list of letters
that will remain available after.
    """
    for i in xrange(len(lis)):
        l = lis[i]
        if playable(dic, l):
            return (l, lis[i + 1:])

def solve(dic, lis):
    """Main solving function. 'dic' contains the initial dictionary of all possible words. 'lis' is
the predefined list of letters that the player will try in order.

Returns the word from the dictionary that will make the player lose the most points.
    """
    wordpos = {}
    for i in xrange(len(dic)):
        wordpos[dic[i]] = i
    status = {}
    for w in dic:
        state = "__________"[0:len(w)]
        if state not in status:
            status[state] = (0, lis, [w])
        else:
            status[state][2].append(w)

    maxscore = -1
    maxword = ""
    while len(status) > 0:
        new_status = {}
        for state in status:
            (score, letters, words) = status[state]
            if len(words) == 1:
                if ((score > maxscore) or
                    ((score == maxscore) and (wordpos[words[0]] < wordpos[maxword]))):
                    maxscore = score
                    maxword = words[0]
            else:
                (l, next_letters) = next_letter(words, letters)
                for w in words:
                    (new_state, lose) = play_letter(state, w, l)
                    if new_state not in new_status:
                        new_status[new_state] = (score + (1 if lose else 0),
                                                 next_letters,
                                                 [w])
                    else:
                        new_status[new_state][2].append(w)
        status = new_status
        
    return maxword

def solve_case(case):
    """Solves a full case, containing a dictionary of words and a list of lists of letters.

Returns the list the words to play for each list of letter.
    """
    (index, D, L) = case
    return (index, [solve(D, lis) for lis in L])

def solve_with_pool(cases, workers):
    """Solves the whole set of cases using a pool of processes.
    """
    from multiprocessing import Pool

    pool = Pool(workers)

    async_results = [pool.apply_async(solve_case, args=(case,)) for case in cases]
    pool.close()
    pool.join()
    
    results = [ar.get() for ar in async_results]
    results.sort()
    return results
    
def solve_without_pool(cases):
    """Solves the whole set of cases directly and sequentially, without resorting to other threads
or processes.
    """
    sync_results = [solve_case(case) for case in cases]
    return sync_results
    
                         
def main(input, output):
    """Program entry point. Read problem from 'input' and writes the solution to 'output'.
    """

    multi = False
    workers = None
    if len(sys.argv) > 1:
        if sys.argv[1] == "-w":
            multi = True
            if len(sys.argv) > 2:
                workers= int(sys.argv[2])
    
    cases = []
    T = int(input.readline())
    for index in xrange(1, T + 1):
        [N, M] = [int(x) for x in input.readline().strip().split()]
        D = [input.readline().strip() for x in xrange(N)]
        L = [input.readline().strip() for x in xrange(M)]
        cases.append((index, D, L))

    if multi:
        results = solve_with_pool(cases, workers)
    else:
        results = solve_without_pool(cases)
        
    for (index, words) in results:
        print("Case #%d: %s" % (index, " ".join(words)), file=output)

        
if __name__ == "__main__":
    main(sys.stdin, sys.stdout)

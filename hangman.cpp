/*
 * (c) 2011 Laurent Vaucher
 * http://www.slowfrog.com
 * This file is under Apache License V2.
 */
#include <iostream>
#include <map>
#include <string>
#include <vector>
#include <unordered_map>
#include <cstdlib>
#include <cstring>

#include <omp.h>
using namespace std;

string BASE = "__________";
string BASES[] = { "",
                   "_",
                   "__",
                   "___",
                   "____",
                   "_____",
                   "______",
                   "_______",
                   "________",
                   "_________",
                   "__________" };
string NO_WORD = "<no word>";

typedef pair<char, int> string_pair;
typedef pair<string, bool> play_result;
typedef string const *word;

/* This is a struct-like class that holds temporary states of the resolution. */
class stats {
public:
  /* Score (number of points lost by the player up to now) */
  int score;
  /* Index of the start of the remaining letters. */
  int letters;
  /* List of words matching the current state. */
  vector<word> words;
};

/* Knowing the set of words that are still possible, stored in 'dic', checks if letter 'l' is
 * a valid guess.
 */
bool playable(vector<word> const &dic, char l) {
  for (int i = 0; i < dic.size(); ++i) {
    if (dic[i]->find(l) != string::npos) {
      return true;
    }
  }
  return false;
}

/* Knowing the set of words that are still possible, stored in 'dic', and the list of available
 * letters in order, finds the next valid letter.
 *
 * Returns a pair of values. The first one is the next letter to try. The second is the list of
 * letters that will remain available after.
 */
string_pair next_letter(vector<word> const &dic, string const &lis, int start) {
  for (int i = start; i < lis.size(); ++i) {
    if (playable(dic, lis[i])) {
      return string_pair(lis[i], i + 1);
    }
  }
  return string_pair();
}

/* What happens when the player guesses the letter 'l' when the word is 'word' and the current
 *  state is 'state'.
 *
 * Returns a pair of values. The first one is the new state, with all occurrences of 'l'
 * discovered. The second one is a boolean value that is True is the player loses a point because
 * he guessed wrong.
 */
play_result play_letter(string const &state, word word, char const l) {
  string res(state);
  bool lose = true;
  int size = state.size();
  char const *chars = word->c_str();
  for (int i = 0; i < size; ++i) {
    if (chars[i] == l) {
      res[i] = l;
      lose = false;
    }
  }
  return play_result(move(res), lose);
}

/* Main solving function. 'dic' contains the initial dictionary of all possible words. 'lis' is
 * the predefined list of letters that the player will try in order.
 *
 * Returns the word from the dictionary that will make the player lose the most points.
 */     
string solve_one(vector<string> const &dic, string const &lis) {
  unordered_map<word, int> wordindex;
  unordered_map<string, stats> st1;
  unordered_map<string, stats> st2;
  unordered_map<string, stats> *status = &st1;
  bool status_is_st1 = true;
  for (int i = 0; i < dic.size(); ++i) {
    string const &w = dic[i];
    string const &state = BASES[w.size()];
    stats &init = (*status)[state];
    init.score = 0;
    init.letters = 0;
    init.words.push_back(&w);

    wordindex[&w] = i;
  }
  
  int maxscore = -1;
  word maxword = &NO_WORD;
  
  while (status->size() > 0) {
    unordered_map<string, stats> *new_status = (status_is_st1 ? &st2 : &st1);
    new_status->clear();
    for (unordered_map<string, stats>::iterator it = status->begin(); it != status->end(); ++it) {
      string const &state = it->first;
      stats const &stat = it->second;
      if (stat.words.size() == 1) {
        if ((stat.score > maxscore) ||
            ((stat.score == maxscore) && (wordindex[stat.words[0]] < wordindex[maxword]))) {
          maxscore = stat.score;
          maxword = stat.words[0];
        }
      } else {
        string_pair nl = next_letter(stat.words, lis, stat.letters);
        int next_letters = nl.second;
        char const l = nl.first;
        for (int i = 0; i < stat.words.size(); ++i) {
          word w = stat.words[i];
          play_result pr = play_letter(state, w, l);
          
          string const &new_state = pr.first;
          bool lose = pr.second;
          stats &new_stat = (*new_status)[new_state];
          new_stat.score = stat.score + (lose ? 1 : 0);
          new_stat.letters = next_letters;
          new_stat.words.push_back(w);
        }
      }
    }
    
    status = new_status;
    status_is_st1 = !status_is_st1;
  }
  
  return *maxword;
}

/* Solves a full case, containing a dictionary of words and a list of lists of letters.
 *
 * Return the list the words to play for each list of letter.
 */
vector<string> solve_case(int index, vector<string> const &dic, vector<string> const &lists) {
  vector<string> results(lists.size());
  int tid = omp_get_thread_num();
  #pragma omp critical
  cerr << "***Thread " << tid <<
    ": Case #" << index << ": N=" << dic.size() << ": M=" << lists.size() << endl;
  
  for (int i = 0; i < lists.size(); ++i) {
    string lis = lists[i];
    string const &res = solve_one(dic, lis);
    results[i] = res;
  }
  return results;
};

/* Entry function. */
int main(int argc, char const* argv[]) {

  bool multi = false;
  int workers = 0;
  if (argc > 1) {
    if (strcmp(argv[1], "-w") == 0) {
      multi = true;
      if (argc > 2) {
        workers = atoi(argv[2]);
      }
    }
  }
  
  int T;
  cin >> T;
  cerr << "Test cases: " << T << endl;
  pair<vector<string>, vector<string> > cases[T];
  for (int c = 0; c < T; ++c) {
    int index = c + 1;
    int N, M;
    cin >> N >> M;
    vector<string> &dic = cases[c].first;
    vector<string> &lists = cases[c].second;
    string str;
    for (int i = 0; i < N; ++i) {
      cin >> str;
      dic.push_back(str);
    }
    for (int i = 0; i < M; ++i) {
      cin >> str;
      lists.push_back(str);
    }
  }

  vector<string> res[T];

#pragma omp parallel for schedule(dynamic) num_threads(workers) if(multi)
  for (int i = 0; i < T; ++i) {
    pair<vector<string>, vector<string> >& casei = cases[i];
    int index = i + 1;
    vector<string> words = solve_case(index, casei.first, casei.second);
    res[i] = words;
  }

  for (int i = 0; i < T; ++i) {
    int index = i + 1;
    cout << "Case #" << index << ":";
    vector<string> words = res[i];
    
    for (int i = 0; i < words.size(); ++i) {
      cout << " " << words[i];
    }
    cout << endl;
  }
  return 0;
}

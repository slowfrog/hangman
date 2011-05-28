/*
 * (c) 2011 Laurent Vaucher
 * http://www.slowfrog.com
 * This file is under Apache License V2.
 */
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;

/**
 * Main class, because Java needs class.
 */
public class hangman {

  /** Struct-like class to store the information about one test case. */
  private static final class Case {
    /** Index of the case. */
    public int index;
    /** List of dictionary words. */
    public List<String> dic;
    /** List of letters to be played in order. */
    public List<String> lists;
    public Case(int index, List<String> dic, List<String> lists) {
      this.index = index;
      this.dic = dic;
      this.lists = lists;
    }
  };

  /** Struct-like class to store the information about one result. */
  private static final class Result {
    /** Index of the case. */
    public int index;
    /** List of words to play for each list of letters from the test case. */
    public List<String> words;
    
    public Result(int index, List<String> words) {
      this.index = index;
      this.words = words;
    }
    /** Transforms the result into the expected output format. */
    public String toString() {
      String ret = "Case #" + this.index + ":";
      for (String word: this.words) {
        ret += " " + word;
      }
      return ret;
    }
  };

  /** Main entry point. */
  public static void main(String[] args) {
    try {

      boolean multi = false;
      int workers = 0;
      if (args.length > 0) {
        if (args[0].equals("-w")) {
          multi = true;
          if (args.length > 1) {
            workers = Integer.parseInt(args[1]);
          }
        }
      }
      
      BufferedReader r = new BufferedReader(new InputStreamReader(System.in));
      int T = Integer.parseInt(r.readLine());
      System.err.println("T=" + T);
      Case[] cases = new Case[T];
      for (int index = 1; index <= T; ++index) {
        long start = System.currentTimeMillis();
        String[] t = r.readLine().split("\\s");
        int N = Integer.parseInt(t[0]);
        int M = Integer.parseInt(t[1]);
        System.err.println("#" + index + ": N=" + N + ", M=" + M);
        List<String> dic = new ArrayList<String>(N);
        List<String> lists = new ArrayList<String>(M);
        for (int x = 0; x < N; ++x) {
          dic.add(r.readLine());
        }
        for (int x = 0; x < M; ++x) {
          lists.add(r.readLine());
        }
        Case c = new Case(index, dic, lists);
        cases[index - 1] = c;
      }

      Result[] results = (multi ?
                          solve_with_pool(cases, workers) :
                          solve_without_pool(cases));
                          
      for (Result result : results) {
        System.out.println(result);
      }
      
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  /** Solves the whole set of cases directly and sequentially, without resorting to other threads
   * or processes.
   */
  public static Result[] solve_without_pool(Case[] cases) {
    Result[] results = new Result[cases.length];
    for (Case c : cases) {
      results[c.index - 1] = solve_case(c);
    }
    return results;
  }

  /** Solves the whole set of cases using a pool of processes. */
  public static Result[] solve_with_pool(Case[] cases, int workers) {
    int realworkers = (workers < 1 ? Runtime.getRuntime().availableProcessors() : workers);
    ExecutorService pool = Executors.newFixedThreadPool(realworkers);

    // Using Hashtable because it is synchronized
    @SuppressWarnings({"unchecked"})
    FutureTask<Result>[] fresults = new FutureTask[cases.length];
    for (int i = 0; i < cases.length; ++i) {
      final Case c = cases[i];
      fresults[i] = new FutureTask<Result>(new Callable<Result>() {
        public Result call() {
          return solve_case(c);
        }
        });
      pool.execute(fresults[i]);
    }
    pool.shutdown();
    try {
      pool.awaitTermination(1, TimeUnit.DAYS);
      Result[] results = new Result[cases.length];
      for (int i = 0; i < cases.length; ++i) {
        results[i] = fresults[i].get();
      }
      return results;
      
    } catch (InterruptedException e) {
    } catch (ExecutionException e) {
    }
    return null;
  }

  /** Solves a full case, containing a dictionary of words and a list of lists of letters.
   *
   * @return the list the words to play for each list of letter.
   */
  public static Result solve_case(Case c) {
    List<String> words = new ArrayList<String>(c.lists.size());
    for (String list : c.lists) {
      words.add(solve(c.dic, list));
    }
    return new Result(c.index, words);
  }

  /** This is a struct-like class that holds temporary states of the resolution. */
  private static final class Status {
    /** Score (number of points lost by the player up to now) */
    public int score;
    /** Remaining letters in order. */
    public String next_letters;
    /** List of words matching the current state. */
    public List<String> words;
    public Status(int score, String next_letters, List<String> words) {
      this.score = score;
      this.next_letters = next_letters;
      this.words = words;
    }
  };

  /** Main solving function. 'dic' contains the initial dictionary of all possible words. 'lis' is
   * the predefined list of letters that the player will try in order.
   *
   * @return the word from the dictionary that will make the player lose the most points.
   */     
  public static String solve(List<String> dic, String lis) {
    Map<String, Integer> wordpos = new HashMap<String, Integer>();
    for (int i = 0; i < dic.size(); ++i) {
      wordpos.put(dic.get(i), i);
    }

    Map<String, Status> status = new HashMap<String, Status>();
    for (String w : dic) {
      String state = "__________".substring(0, w.length());
      Status st = status.get(state);
      if (st == null) {
        List<String> tmplst = new ArrayList<String>();
        tmplst.add(w);
        status.put(state, new Status(0, lis, tmplst));
      } else {
        st.words.add(w);
      }
    }

    int maxscore = -1;
    String maxword = "";

    while (status.size() > 0) {
      Map<String, Status> new_status = new HashMap<String, Status>();
      for (Map.Entry<String, Status> entry : status.entrySet()) {
        String state = entry.getKey();
        Status tmp = entry.getValue();
        int score = tmp.score;
        String letters = tmp.next_letters;
        List<String> words = tmp.words;
        if (words.size() == 1) {
          if ((score > maxscore) ||
              ((score == maxscore) && (wordpos.get(words.get(0)) < wordpos.get(maxword)))) {
            maxscore = score;
            maxword = words.get(0);
          }
        } else {
          String[] tmp2 = next_letter(words, letters);
          String l = tmp2[0];
          String next_letters = tmp2[1];
          for (String w : words) {
            String[] tmp3 = play_letter(state, w, l);
            String new_state = tmp3[0];
            String lose = tmp3[1];
            Status st = new_status.get(new_state);
            if (st == null) {
              int new_score = score + (Boolean.valueOf(lose) ? 1 : 0);
              List<String> tmplst = new ArrayList<String>();
              tmplst.add(w);
              new_status.put(new_state, new Status(new_score, next_letters, tmplst));
              
            } else {
              st.words.add(w);
            }
          }
        }
      }
      status = new_status;
    }
    
    return maxword;
  }

  /** Knowing the set of words that are still possible, stored in 'dic', and the list of available
   * letters in order, finds the next valid letter.
   *
   * @return a pair of values. The first one is the next letter to try. The second is the list of
   * letters that will remain available after.
   */
  public static String[] next_letter(List<String> dic, String lis) {
    for (int i = 0; i < lis.length(); ++i) {
      char l = lis.charAt(i);
      if (playable(dic, l)) {
        return new String[] { lis.substring(i, i + 1), lis.substring(i + 1) };
      }
    }
    return null;
  }

  /** Knowing the set of words that are still possible, stored in 'dic', checks if letter 'l' is
   * a valid guess.
   */
  public static boolean playable(List<String> dic, char l) {
    for (String w : dic) {
      if (w.indexOf(l) >= 0) {
        return true;
      }
    }
    return false;
  }

  /** What happens when the player guesses the letter 'l' when the word is 'word' and the current
   *  state is 'state'.
   *
   * @return a pair of values. The first one is the new state, with all occurrences of 'l'
   * discovered. The second one is a boolean value that is True is the player loses a point because
   * he guessed wrong.
   */
  public static String[] play_letter(String state, String word, String l) {
    char ll = l.charAt(0);
    String ret = "";
    boolean lose = true;
    for (int i = 0; i < state.length(); ++i) {
      if (word.charAt(i) == ll) {
        ret += ll;
        lose = false;
      } else {
        ret += state.charAt(i);
      }
    }
    return new String[] { ret, Boolean.toString(lose) };
  }
}

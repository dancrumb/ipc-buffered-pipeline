# Startup Permutations

In the most basic set-up, there are a number of players:

 - Process `A`
 - Process `B`
 - IncomingPort `I`
 - OutgoingPort `O`
 
For these four players, there are a number of actions that can occur:

 1. `A` starts
 1. `B` starts
 1. `A` attempts to connect to `B`
 1. `B` attempts to connect to `A`
 1. `O` is created
 1. `I` is created
 1. `O` attempts to connect to `I`
 1. `I` attempts to connect back to `O`
 1. `O` attempts to send a message
 1. `I` attempts to receive a message
 
These can happen in a number of orders and it's important that all of these are
handled in a sensible way.

Let's assume `A` owns `I` and `B` owns `O`.

## Iterations

There are `10!` or over 3 million different iterations of 10 steps, so we need
to apply some knowledge to shrink this search space.

By definition
 * 3 cannot precede 1
 * 4 cannot precede 2
 * 6 cannot precede 1
 * 5 cannot precede 2
 * 7 & 10 cannot precede 6
 * 8 & 9 cannot precede 5
 * 8 cannot precede 7

Using these rules brings us down to 8064 possibilities. That's much more manageable for testing
although it will require that the test cases be programatically built.

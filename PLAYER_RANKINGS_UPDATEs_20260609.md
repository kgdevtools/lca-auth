

Once we receive the updaetd design files from claude code, lets update the player-rankings table view as per client specs

** Rememebr to merge the branches (the player profile stuff was staged to another branch and commited to github)
** Rmemebr to remove the old view files ONLY after complete review of the new /chess-games and embedded assets in the player prfolie page under the games tab (keeping the simplistic and well strucutred and designed new board along with its supporting components)


Edit the columns in table
- Just before the Performance column, add 2 new columns (one we've already implemented before and another was form an old old view version but i think implementation is still baked intp either the actions or some db querying otherwise just implement the logic')
-- Add Age Group (values should things like U20, or U16 or SEN or VET etc. each bound to their category, so no u14s shown as u16s, to each their own age group)
-- After that(before the Performance) add back teh Ratings with Chess SA and FIDE ratings used

(For order of rendering on small mobile, just keep to current order of precedence and include any that are pertinent)

Ive modifed the CDC Selection file, just one line where we do Senior selection criteria, its just minimum of 6 tournamnts(abywhere no location restriction)

IMPORTANT: THIS IS A REOCCURING PROBLEM AND ISSUE WHICH I THOUGH WE FIXED BUT SEEMS TO HAVE SPILLED OVER TO THE DROPDOWN OF THE PLAYER NAME.
- THE TOURNAMENT HISTORY IN THE DROPDOWN IS CUT OFF FORM HAVING FULL WIDTH, I THINK ITS FROM THE MERGINIG OR IMPLEMENTATION OF THE MERGING OF THE SELECTION COLUMN, THAT COMPOENTN SHOULD BE FULL WIDTH NOT CUTOFF [screenshot]

- Under the player card, the last compoentn/elemetn with summarized comments/remarks section
-- rempve the card design, if you want to sticj to background coloring remove all border styling, make it full width, using good UI/UX heirarchy and visual design,not too much though

Lets take care of text alignment especially inside tbale cells, we need consistent alignment for good visual feel, especially on the comments/remarks section

All changes should be mobile first approach, with emphasis on not forgetting the little guys and those light mode users

Write to a phase by phase plan BEFORE ANY CODE EDITS REVIEW OF THE PLAN MUST BE MADE BY ME AND APPROVAL

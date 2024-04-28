# truth-llm-bot

# Communications for Threads

<- User Output
-> Input to function
<-> Get new programmatic information
---

-> execute
-> create assistant (assistant profile) [String]
-> create thread
-> create message (message instruction) [String]
<- Update user info in discord
-> Start gpt Function
  -> Create run in thread
  <-> Get the Run status
  -> Start looping for status not completed
  <- Notify User the run status
  <-> Update run Status 
  -> check if status is Requires action
    -> Run function requested by the GPT Assistant
      -> Call search or article function
      -> Tool output returns data to thread with submitToolOutputs
      <- Get latest message in thread
  -> Get and print last mssage
  -> Set status to done in feedback
  -> Follow up with the GPT assistants answer
  
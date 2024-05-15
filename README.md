# truth-llm-bot

#### Required Variables

DISCORD_TOKEN
CLIENT_ID
GUILD_ID
CHATGPT_API_KEY
DIFFBOT_API_KEY (while external Internet is required)

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
  
V1 openAI
"openai": "^4.29.1"
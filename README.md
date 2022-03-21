# ColMind
Collaborative MindMap solution

Using MindElixir library as the mindmap render code, this is a collaborative mindmap solution. Several users can build mindmaps together, working simultaneously on the same graph. 

They only need to share the same ID to be able to collaborate.
Data is only stored in memory of the server. To scale the solution to a huge number of users, the state needs to be preserved in a durable cache or database.

This is a simple nodeJS app, run it and deploy it as usual.

Check MindElixir library here https://github.com/ssshooter/mind-elixir-core
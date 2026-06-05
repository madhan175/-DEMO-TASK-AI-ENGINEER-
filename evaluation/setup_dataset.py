import json

normal_prompts = [
    {"id": 1, "prompt": "Build a CRM with login, contacts, and dashbaord."},
    {"id": 2, "prompt": "Create an e-commerce app with products and payments."},
    {"id": 3, "prompt": "Construct a task manager with projects and subtasks."},
    {"id": 4, "prompt": "Develop a fitness tracker with workout logs and goals."},
    {"id": 5, "prompt": "Build a recipe book with categories and search."},
    {"id": 6, "prompt": "Create a movie database with actors and ratings."},
    {"id": 7, "prompt": "Construct a library system with books and loans."},
    {"id": 8, "prompt": "Develop a simple chat app with rooms and messages."},
    {"id": 9, "prompt": "Build a portfolio site with projects and contact form."},
    {"id": 10, "prompt": "Create an inventory system for a small shop."}
]

with open("evaluation/prompts/normal_prompts.json", "w") as f:
    json.dump(normal_prompts, f, indent=2)

edge_cases = [
    {"id": 11, "prompt": "Make an app."}, # Vague
    {"id": 12, "prompt": "Build a CRM but with no database."}, # Conflicting
    {"id": 13, "prompt": "Create a system that does everything."}, # Excessive
    {"id": 14, "prompt": "Construct a social network with 1 billion users tomorrow."}, # Unrealistic
    {"id": 15, "prompt": "Develop a secure app with no authentication."}, # Conflicting
    {"id": 16, "prompt": "Build a UI for a command line tool."}, # Mismatch
    {"id": 17, "prompt": "Create a CRM with only one page and no buttons."}, # Incomplete
    {"id": 18, "prompt": "Construct a database for a non-existent company."}, # Vague
    {"id": 19, "prompt": "Develop a payment system with no money."}, # Paradox
    {"id": 20, "prompt": "Build an app using only emojis as requirements. 🍕🚀🛒"} # Obscure
]

with open("evaluation/prompts/edge_cases.json", "w") as f:
    json.dump(edge_cases, f, indent=2)

import json

def run_health_check(filepath):
    print(f"Running health check on {filepath}...")
    with open(filepath, 'r') as f:
        graph = json.load(f)

    errors = 0
    all_ids = set(graph.keys())

    for node_id, node_data in graph.items():
        # Check for neighbor symmetry
        for neighbor_id in node_data.get('neighbors', []):
            if neighbor_id not in all_ids:
                print(f"[ERROR] Node {node_id} lists non-existent neighbor: {neighbor_id}")
                errors += 1
                continue

            neighbor_node = graph[neighbor_id]
            if node_id not in neighbor_node.get('neighbors', []):
                print(f"[ERROR] Asymmetry found! {node_id} -> {neighbor_id}, but not vice-versa.")
                errors += 1

    if errors == 0:
        print("Health check passed! All neighbor relationships are symmetrical.")
    else:
        print(f"\nHealth check failed with {errors} errors.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python verify_data.py <path_to_graph_json>")
        sys.exit(1)

    graph_path = sys.argv[1]
    run_health_check(graph_path)
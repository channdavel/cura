import json
import random
import matplotlib.pyplot as plt

def visualize_random_node_and_neighbors(filepath):
    """
    Picks a random node from the graph and plots it along with its neighbors.
    """
    with open(filepath, 'r') as f:
        graph = json.load(f)

    # 1. Pick a random node that has at least a few neighbors
    random_node_id = random.choice([k for k,v in graph.items() if len(v['neighbors']) > 2])
    central_node = graph[random_node_id]

    neighbor_ids = central_node['neighbors']
    neighbor_nodes = [graph[nid] for nid in neighbor_ids if nid in graph]

    # 2. Extract coordinates for plotting
    central_lon, central_lat = central_node['lon'], central_node['lat']
    neighbor_lons = [n['lon'] for n in neighbor_nodes]
    neighbor_lats = [n['lat'] for n in neighbor_nodes]

    # 3. Plot the results
    plt.figure(figsize=(10, 8))
    # Plot neighbors
    plt.scatter(neighbor_lons, neighbor_lats, c='red', label='Neighbors', s=50)
    # Plot central node
    plt.scatter([central_lon], [central_lat], c='blue', label='Central Node', s=150, zorder=5, edgecolors='k')

    plt.title(f'Visualization for Node: {random_node_id}')
    plt.xlabel('Longitude')
    plt.ylabel('Latitude')
    plt.legend()
    plt.grid(True)
    plt.show()

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python data_vis.py <path_to_graph_json>")
        sys.exit(1)

    graph_path = sys.argv[1]
    visualize_random_node_and_neighbors(graph_path)
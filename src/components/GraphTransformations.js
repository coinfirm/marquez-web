export function transformDataToGraph(
  data,
  nodeSelected,
  graphType,
  currNamespace
) {
  const TYPE_SEPARATOR = "\u241F";
  var jobMap = new Map();
  var datasetMap = new Map();
  var datasets = [];
  var stored = new Set();
  var jobs = [];
  var graphNoDatasets = {
    nodes: [],
    edges: []
  };
  var graphNoJobs = {
    nodes: [],
    edges: []
  };
  var graph = {
    nodes: [],
    edges: []
  };
  var jobEntryObject = null;
  var jobEntrySubject = null;
  var datasetEntrySubject = null;
  var datasetEntryObject = null;
  data.map(entry => {
    const {
      subject,
      subjectType,
      subjectNamespace,
      object,
      objectType,
      objectNamespace
    } = entry;
    var subjectId = subject + TYPE_SEPARATOR + subjectType;
    var objectId = object + TYPE_SEPARATOR + objectType;
    if (!stored.has(subjectId)) {
      var subjectNode = {
        id: subjectId,
        label: subject,
        borderWidth: subjectId === nodeSelected ? 3 : 1,
        title: subjectNamespace,
        color: {
          background:
            currNamespace === subjectNamespace
              ? subjectType === "job"
                ? "orange"
                : "cyan"
              : subjectType === "job"
              ? "salmon"
              : "lightseagreen",
          highlight: {
            border: "black"
          }
        }
      };
      graph.nodes.push(subjectNode);
      if (subjectType !== "job") {
        graphNoJobs.nodes.push(subjectNode);
      }
      if (subjectType !== "dataset") {
        graphNoDatasets.nodes.push(subjectNode);
      }
      stored.add(subjectId);
    }
    if (!stored.has(objectId)) {
      var objectNode = {
        id: objectId,
        label: object,
        borderWidth: objectId === nodeSelected ? 3 : 1,
        title: objectNamespace,
        color: {
          background:
            currNamespace === objectNamespace
              ? objectType === "job"
                ? "orange"
                : "cyan"
              : objectType === "job"
              ? "salmon"
              : "lightseagreen",
          highlight: {
            border: "black"
          }
        }
      };
      graph.nodes.push(objectNode);
      if (objectType !== "job") {
        graphNoJobs.nodes.push(objectNode);
      }
      if (objectType !== "dataset") {
        graphNoDatasets.nodes.push(objectNode);
      }
      stored.add(objectId);
    }
    if (subjectType === "job") {
      if (jobs.includes(subjectId)) {
        jobEntrySubject = jobMap.get(subjectId);
        jobEntrySubject.output.push(objectId);
        jobMap.set(subjectId, jobEntrySubject);
      } else {
        jobMap.set(subjectId, {
          jobId: subjectId,
          input: [],
          output: [objectId]
        });
        jobs.push(subjectId);
      }
    } else {
      if (jobs.includes(objectId)) {
        jobEntryObject = jobMap.get(objectId);
        jobEntryObject.input.push(subjectId);
        jobMap.set(objectId, jobEntryObject);
      } else {
        jobMap.set(objectId, {
          jobId: objectId,
          input: [subjectId],
          output: []
        });
        jobs.push(objectId);
      }
    }
    if (subjectType === "dataset") {
      if (datasets.includes(subjectId)) {
        datasetEntrySubject = datasetMap.get(subjectId);
        datasetEntrySubject.outputJob.push(objectId);
        datasetMap.set(subjectId, datasetEntrySubject);
      } else {
        datasetMap.set(subjectId, {
          datasetId: subjectId,
          inputJob: [],
          outputJob: [objectId]
        });
        datasets.push(subjectId);
      }
    } else {
      if (datasets.includes(objectId)) {
        datasetEntryObject = datasetMap.get(objectId);
        datasetEntryObject.inputJob.push(subjectId);
        datasetMap.set(objectId, datasetEntryObject);
      } else {
        datasetMap.set(objectId, {
          datasetId: objectId,
          inputJob: [subjectId],
          outputJob: []
        });
        datasets.push(objectId);
      }
    }

    graph.edges.push({ from: subjectId, to: objectId });
    return null;
  });
  switch (graphType) {
    case "Jobs":
      for (var hh = 0; hh < datasets.length; hh++) {
        var datasetEntry = datasetMap.get(datasets[hh]);
        var { inputJob, outputJob } = datasetEntry;
        if (inputJob.length !== 0 && outputJob.length !== 0) {
          for (var i = 0; i < inputJob.length; i++) {
            for (var j = 0; j < outputJob.length; j++) {
              graphNoDatasets.edges.push({
                from: inputJob[i],
                to: outputJob[j]
              });
            }
          }
        }
      }
      graphNoDatasets.edges.sort();
      graphNoDatasets.nodes.sort();
      return graphNoDatasets;
    case "Datasets":
      for (var ii = 0; ii < jobs.length; ii++) {
        var jobEntry = jobMap.get(jobs[ii]);
        var { input, output } = jobEntry;
        if (input.length !== 0 && output.length !== 0) {
          for (var jj = 0; jj < input.length; jj++) {
            for (var kk = 0; kk < output.length; kk++) {
              graphNoJobs.edges.push({
                from: input[jj],
                to: output[kk]
              });
            }
          }
        }
      }
      graphNoJobs.edges.sort();
      graphNoJobs.nodes.sort();
      return graphNoJobs;
    case "Jobs and Datasets":
      graph.edges.sort();
      graph.nodes.sort();
      return graph;
    default:
      graph.edges.sort();
      graph.nodes.sort();
      return graph;
  }
}

function buildAdjList(graph) {
  var relativesFrom = null;
  var relativesTo = null;
  var adjList = new Map();
  var stored = new Set();
  var { edges } = graph;
  for (var ii = 0; ii < edges.length; ii++) {
    var edge = edges[ii];
    var { from, to } = edge;
    if (!stored.has(from)) {
      adjList.set(from, { name: from, parents: [], children: [to] });
      stored.add(from);
    } else {
      relativesFrom = adjList.get(from);
      relativesFrom.children.push(to);
      adjList.set(from, relativesFrom);
    }
    if (!stored.has(to)) {
      adjList.set(to, { name: to, parents: [from], children: [] });
      stored.add(to);
    } else {
      relativesTo = adjList.get(to);
      relativesTo.parents.push(from);
      adjList.set(to, relativesTo);
    }
  }
  return adjList;
}

export function filterGraph(
  data,
  nodeSelected,
  relative,
  graphType,
  currNamespace,
  filterOrigin
) {
  var graph = transformDataToGraph(
    data,
    nodeSelected,
    graphType,
    currNamespace
  );
  var adjList = buildAdjList(graph);
  return BFSgetAll(graph, adjList, relative, filterOrigin);
}

function BFSgetAll(graph, adjList, relative, datasetName) {
  var nodeList = graph.nodes.map(node => node.id);
  var fGraph = {
    nodes: [],
    edges: []
  };
  if (datasetName === null || !nodeList.includes(datasetName)) {
    return fGraph;
  }
  var firstNode = adjList.get(datasetName);
  var coming = [];
  var seen = new Set();
  coming.push(firstNode.name);
  while (coming.length > 0) {
    var nodeName = coming.shift();
    if (!seen.has(nodeName)) {
      seen.add(nodeName);
      var node = adjList.get(nodeName);
      var relatives = relative === "parents" ? node.parents : node.children;
      for (var i = 0; i < relatives.length; i++) {
        coming.push(relatives[i]);
      }
    }
  }
  fGraph.nodes = graph.nodes.filter(node => seen.has(node.id)).sort();
  fGraph.edges = graph.edges
    .filter(edge => seen.has(edge.to) && seen.has(edge.from))
    .sort();
  return fGraph;
}

export function transformDatasetList(datasets) {
  var newDatasets = "";
  if (datasets.length <= 1) {
    return datasets;
  } else {
    for (var ii = 0; ii < datasets.length; ii++) {
      newDatasets += datasets[ii];
      if (ii < datasets.length - 1) {
        newDatasets += ", ";
      }
    }
    return newDatasets;
  }
}
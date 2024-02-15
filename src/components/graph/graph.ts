import type { GraphData } from '$lib/types';
import { handleNewArticles } from './articleProcessor';

// TODO 
// if articles have already been calculated display nodes with their links
// if articles are not yet calculated
// check if articles' embedings have been retrieved
// if not, retrieve them
// otherwise for each calculate cos similarity between 
// articles for all the ones that haven't have their scored calculated yet
// and store those scores then display nodes with their links





const handleAddition: (graphData: GraphData) => void = () => {
    // TODO
    // add nodes and links from the graph
    console.log('handleAddition');
};
const handleRemoval: (id: number) => void = () => {
    // TODO
    // remove nodes and links from the graph
    console.log('handleRemoval');
};




export { handleAddition, handleRemoval, handleNewArticles };

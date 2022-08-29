import { useState } from 'react';
import { createTodo } from './graphql/mutations';
import { API, DataStore, graphqlOperation } from 'aws-amplify';
import { Button, Flex, Heading } from '@aws-amplify/ui-react';
import { Todo } from './models';
import { listTodos } from './graphql/queries';

const TEST_INPUT_OBJECT: object = {
  key1: 'hi',
  key2: 3,
  'weirdKey:hello': { nested: true }
};

const createViaAPI = async (): Promise<string> => {
  const proposedTodo = {
    // Maybe expected
    // requiredJsonBlog: TEST_INPUT_OBJECT, // {"data":null,"errors":[{"path":null,"locations":[{"line":1,"column":21,"sourceName":null}],"message":"Variable 'optionalJsonBlog' has an invalid value. Unable to parse {key1=hi, key2=3, weirdKey:hello={nested=true}} as valid JSON."}]}
    // optionalJsonBlog: TEST_INPUT_OBJECT,
    // What the types suggest
    requiredJsonBlog: JSON.stringify(TEST_INPUT_OBJECT),
    optionalJsonBlog: JSON.stringify(TEST_INPUT_OBJECT),
  };
  const response = await API.graphql(graphqlOperation(createTodo, { input: proposedTodo }));
  return JSON.stringify(response);
};

const createViaDataStore = async (): Promise<string> => {
  const response = await DataStore.save(new Todo({
    // Maybe expected
    // THIS WORKS if you do gross type manipulation
    // requiredJsonBlog: TEST_INPUT_OBJECT,
    // optionalJsonBlog: TEST_INPUT_OBJECT,
    // What the types suggest
    requiredJsonBlog: JSON.stringify(TEST_INPUT_OBJECT),
    optionalJsonBlog: JSON.stringify(TEST_INPUT_OBJECT),
  }));
  return JSON.stringify(response);
};

const listViaAPI = async (): Promise<string> => {
  // Returns the json objects in a serialized format (typeof string)
  const response = await API.graphql(graphqlOperation(listTodos));
  // @ts-ignore
  const todos: Todo[] = response.data.listTodos.items;
  // @ts-ignore
  return JSON.stringify(todos.filter(todo => !todo._deleted));
};

const listViaDataStore = async (): Promise<string> => {
  // Returns the json objects in a parsed format (typeof object)
  const todos = await DataStore.query(Todo);
  return JSON.stringify(todos);
};

function App() {
  const [latestResponse, setResponse] = useState<string | undefined>();
  const [responseCount, setCount] = useState<number | undefined>();

  const setLatestForFn = async (testCase: () => Promise<string>) => {
    try {
      setResponse(undefined);
      setCount(undefined);
      const response = await testCase();
      try {
        const parsedResponse = await JSON.parse(response);
        if (Array.isArray(parsedResponse)) {
          setCount(parsedResponse.length);
        }
      } catch (e) { /* Who Cares */ }
      setResponse(response);
    } catch (e) {
      setResponse(JSON.stringify(e));
    }
  };

  const deleteAll = async () => {
    setResponse(undefined);
    setCount(undefined);
    try {
      const todos = await DataStore.query(Todo);
      await Promise.all(todos.map(todo => DataStore.delete(todo)));
      setResponse('Deleted all Todos');
    } catch (e) {
      setResponse(JSON.stringify(e));
    }
  };

  return (
    <Flex direction='column'>
      <Heading level={1}>AWSJSON Type Tests</Heading>
      <Heading level={2}>Interactions</Heading>
      <Heading level={3}>Create Invocations</Heading>
      <Flex direction='row'>
        <Button onClick={() => setLatestForFn(createViaAPI)}>Create Via API</Button>
        <Button onClick={() => setLatestForFn(createViaDataStore)}>Create Via DataStore</Button>
      </Flex>
      <Heading level={3}>List Invocations</Heading>
      <Flex direction='row'>
        <Button onClick={() => setLatestForFn(listViaAPI)}>List Via API</Button>
        <Button onClick={() => setLatestForFn(listViaDataStore)}>List Via DataStore</Button>
      </Flex>
      <Heading level={3}>Clean Up</Heading>
      <Flex direction='row'>
        <Button onClick={deleteAll}>Delete All</Button>
      </Flex>
      { latestResponse !== undefined && (
        <Flex direction='column'>
          <Heading level={2}>Latest Response</Heading>
          { responseCount !== undefined && (
            <Flex direction='row'>
              <Heading level={5}>Response Count</Heading>
              <code>{responseCount}</code>
            </Flex>
          ) }
          <Heading level={5}>Deserialized Response</Heading>
          <code>{latestResponse}</code>
        </Flex>
      ) }
    </Flex>
  );
}

export default App;

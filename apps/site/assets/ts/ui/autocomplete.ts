import { autocomplete, getAlgoliaResults } from 'autocompletejs-v1';
import algoliasearch from 'algoliasearch-v4/lite';
import { renderResult } from '../../js/algolia-result';


// redacted keys - substitute yours
// remove this later, the backend is credentialed to perform the querying -- we are merely to send the right query object to our /search/query endpoint
const searchClient = algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_SEARCH_KEY);

export default function setupAlgoliaAutocompleteInput(inputEl: HTMLElement): void {
  autocomplete({
    container: inputEl,
    placeholder: "Get autompleted everythings",
    
    getSources({ query }) {
      return [
        {
          sourceId: 'everything',
          getItems({ query }) {
            return getAlgoliaResults({
              searchClient,
              queries: [
                { indexName: 'stops', query },
                { indexName: 'routes', query },
                { indexName: 'drupal', query }
              ]
            })
          },
          templates: {
            item({ item }) {
              console.table(item)
              return JSON.stringify(item);
            }
            // suggestion: this.renderResult(indexName),
            // footer: this.renderFooterTemplate(indexName)
          }
        }
      ]
    }
  });
}

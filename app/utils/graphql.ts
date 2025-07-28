export const UPDATE_PRODUCT_METAFIELDS = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        metafields(first: 10) {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_PRODUCT_METAFIELDS = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      metafields(first: 10) {
        edges {
          node {
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

export const CREATE_METAFIELD = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface ProductMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface UpdateMetafieldsInput {
  productId: string;
  metafields: ProductMetafield[];
}

export async function updateProductMetafields(
  admin: any,
  productId: string,
  metafields: { namespace: string; key: string; value: string; type: string }[]
) {
  const metafieldsInput = metafields.map(metafield => ({
    id: productId,
    namespace: metafield.namespace,
    key: metafield.key,
    value: metafield.value,
    type: metafield.type,
  }));

  const response = await admin.graphql(UPDATE_PRODUCT_METAFIELDS, {
    variables: {
      metafields: metafieldsInput,
    },
  });

  const result = await response.json();
  
  if (result.data?.metafieldsSet?.userErrors?.length > 0) {
    console.error('GraphQL errors:', result.data.metafieldsSet.userErrors);
    throw new Error(`Failed to update metafields: ${result.data.metafieldsSet.userErrors[0].message}`);
  }

  return result.data?.metafieldsSet?.metafields;
}

export async function getProductMetafields(admin: any, productGid: string) {
  const response = await admin.graphql(GET_PRODUCT_METAFIELDS, {
    variables: { id: productGid },
  });

  const result = await response.json();
  
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    throw new Error('Failed to fetch product metafields');
  }

  return result.data?.product?.metafields?.edges?.map((edge: any) => edge.node) || [];
}
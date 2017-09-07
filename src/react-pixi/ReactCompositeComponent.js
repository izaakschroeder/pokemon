
import ReactCompositeComponent from '@ReactCompositeComponent';
import ReactReconciler from 'react-dom/lib/ReactReconciler';
import shouldUpdateReactComponent from 'react-dom/lib/shouldUpdateReactComponent';

function findDisplayObjectChild(componentinstance) {
  // walk downwards via _renderedComponent to find something with a displayObject
  var componentwalker = componentinstance;
  while (typeof componentwalker !== 'undefined') {
    // no displayObject? then fail
    if (componentwalker.getHostNode.isPIXI) {
      return componentwalker;
    }
    componentwalker = componentwalker._renderedComponent;
  }

  // we walked all the way down and found no displayObject
  return undefined;
}

//
// This modified version of updateRenderedComponent will
// manage displayObject nodes instead of HTML markup
//
let old_updateRenderedComponent = ReactCompositeComponent._updateRenderedComponent;

ReactCompositeComponent._updateRenderedComponent = function(transaction, context) {
  const prevComponentInstance = this._renderedComponent;

  // Find the first actual rendered (non-Composite) component.
  // If that component is a PIXI node we use the special code here.
  // If not, we call back to the original version of updateComponent
  // which should handle all non-PIXI nodes.

  const prevDisplayComponent = findDisplayObjectChild(prevComponentInstance);
  if (!prevDisplayComponent) {
    // not a PIXI node, use the original DOM-style version
    old_updateRenderedComponent.call(this, transaction, context);
    return;
  }
  const prevDisplayObject = prevDisplayComponent._displayObject;

  // This is a PIXI node, do a special PIXI version of updateComponent
  let prevRenderedElement = prevComponentInstance._currentElement;
  let nextRenderedElement = this._renderValidatedComponent();

  if (shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
    ReactReconciler.receiveComponent(
      prevComponentInstance,
      nextRenderedElement,
      transaction,
      this._processChildContext(context)
    );
  } else {
    // We can't just update the current component.
    // So we nuke the current instantiated component and put a new component in
    // the same place based on the new props.
    let thisID = this._rootNodeID;

    let displayObjectParent = prevDisplayObject.parent;

    // unmounting doesn't disconnect the child from the parent node,
    // but later on we'll simply overwrite the proper element in the 'children' data member
    let displayObjectIndex = displayObjectParent.children.indexOf(prevDisplayObject);
    ReactReconciler.unmountComponent(prevComponentInstance);
    displayObjectParent.removeChild(prevDisplayObject);

    // create the new object and stuff it into the place vacated by the old object
    this._renderedComponent = this._instantiateReactComponent(
      nextRenderedElement,
      this._currentElement.type);
    let nextDisplayObject = ReactReconciler.mountComponent(
      this._renderedComponent,
      transaction,
      this._hostParent,
      this._hostContainerInfo,
      this._processChildContext(context),
      this._debugID
    );
    findDisplayObjectChild(this._renderedComponent)._displayObject = nextDisplayObject;

    // fixup _mountImage as well
    this._mountImage = nextDisplayObject;

    // overwrite the reference to the old child
    displayObjectParent.addChildAt(nextDisplayObject, displayObjectIndex);
  }
};

module.exports = ReactCompositeComponent;

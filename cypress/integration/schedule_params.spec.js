describe("URL parameters for schedules/:id/line", () => {
  before(() => {
    // we don't care about fetched data for this tests, stub out empty response
    cy.intercept('/schedules/line_api/realtime*', {});
    cy.intercept('/schedules/finder_api/*', []);
  });

  describe("unidirectional route", () => {
    it("loads without error regardless of URL parameter specifying direction", () => {
      cy.visit("/schedules/171/line")
        .window()
        .its('store')
        .invoke('getState')
        .then((state) => {
          expect(state.selectedDirection).to.equal(0)
        })
      cy.visit("/schedules/171/line?schedule_direction[direction_id]=1")
        .window()
        .its('store')
        .invoke('getState')
        .then((state) => {
          expect(state.selectedDirection).to.equal(1)
        })
      cy.visit("/schedules/171/line?schedule_direction[direction_id]=0")
        .window()
        .its('store')
        .invoke('getState')
        .then((state) => {
          expect(state.selectedDirection).to.equal(0)
        })
    })
  });

  describe("bidirectional route", () => {
    before(() => {
      cy.visit("/schedules/39/line?schedule_direction[direction_id]=1")
    });

    beforeEach(() => {
      cy.get("#react-schedule-finder-root")
        .find("form select").first()
        .as('scheduleFinderDirectionSelect');
    })

    it("gets initial state from URL", () => {
      cy.window().its('store').invoke('getState')
        .should('deep.equal', {
          selectedDirection: 1,
          scheduleFinderDirection: null,
          scheduleFinderOrigin: null,
          modalMode: 'schedule',
          modalOpen: false
        })
    })

    describe("displays initial direction choice", () => {
      it("in direction picker", () => {
        cy.get("#direction-name")
          .should('include.text', "Inbound")
      })

      it("in right rail Schedule Finder", () => {
        cy.get("@scheduleFinderDirectionSelect")
          .find(":selected")
          .should('contain', 'INBOUND')
      });

      describe("after changing direction", () => {
        before(() => {
          cy.contains("Change Direction").click();
        })

        it("updates URL parameter", () => {
          cy.location('search')
            .then((s) => new URLSearchParams(s))
            .invoke('get', 'schedule_direction[direction_id]')
            .should('equal', '0')
        })

        it("updates state", () => {
          cy.window().its('store').invoke('getState').then((state) => {
            expect(state.selectedDirection).to.equal(0)
          })
        })

        it("updates UI with new selection", () => {
          cy.get("#direction-name")
            .should('include.text', "Outbound")
          cy.get("@scheduleFinderDirectionSelect")
            .find(":selected")
            .should('contain', 'OUTBOUND')
        })
      })
    });
  });

  describe("with Schedule Finder open", () => {
    before(() => {
      // Inbound - Back Bay from S Huntington Ave @ Perkins St
      cy.visit("/schedules/39/line?schedule_direction[direction_id]=1&schedule_finder[origin]=6570&schedule_finder[direction_id]=1")
    });

    beforeEach(() => {
      cy.get(".schedule-finder--modal")
        .contains("Choose a direction")
        .find("select")
        .as('scheduleFinderDirectionSelect');
      cy.get(".schedule-finder--modal")
        .contains("Choose an origin stop")
        .find("select")
        .as('scheduleFinderOriginSelect');
    })

    it("gets initial state from URL", () => {
      cy.window().its('store').invoke('getState')
        .should('deep.equal', {
          selectedDirection: 1,
          scheduleFinderDirection: 1,
          scheduleFinderOrigin: '6570',
          modalMode: 'schedule',
          modalOpen: true
        })
    })

    it("displays initial state in UI", () => {
      cy.get("@scheduleFinderDirectionSelect")
        .find(":selected")
        .should('include.text', "INBOUND")

      cy.get("@scheduleFinderOriginSelect")
        .find(":selected")
        .should('include.text', "S Huntington Ave @ Perkins St")
    })

    it("changes direction", () => {
      cy.get("@scheduleFinderDirectionSelect").select("0");

      // now modal should be open for selecting a new origin
      cy.window().its('store').invoke('getState')
        .should('deep.equal', {
          selectedDirection: 1,
          scheduleFinderDirection: 0,
          scheduleFinderOrigin: null,
          modalMode: 'origin',
          modalOpen: true
        });

      // pick a new origin
      cy.get(".schedule-finder__origin-list")
        .contains("677 Huntington Ave")
        .click();

      // back to regular schedule finder moadl
      cy.window().its('store').invoke('getState')
        .should('deep.equal', {
          selectedDirection: 1,
          scheduleFinderDirection: 0,
          scheduleFinderOrigin: "92391",
          modalMode: 'schedule',
          modalOpen: true
        });
      // updated UI
      cy.get("@scheduleFinderDirectionSelect")
       .find(":selected")
       .should('include.text', "OUTBOUND")
      cy.get("@scheduleFinderOriginSelect")
       .find(":selected")
       .should('include.text', "677 Huntington Ave");

      // updated URL
      cy.location('search')
        .then((s) => new URLSearchParams(s))
        .then(params => {
          expect(params.get('schedule_direction[direction_id]')).to.equal("1") // unchanged
          expect(params.get('schedule_finder[origin]')).to.equal("92391")
          expect(params.get('schedule_finder[direction_id]')).to.equal("0")
        });
    });

    it("resets URL on modal close", () => {
      cy.window().its('store')
        .invoke('dispatch', { type: "CLOSE_MODAL" });

      cy.location('search')
        .then((s) => new URLSearchParams(s))
        .then(params => {
          expect(params.get('schedule_direction[direction_id]')).to.equal("1") // unchanged
          expect(params.get('schedule_finder[origin]')).to.be.null
          expect(params.get('schedule_finder[direction_id]')).to.be.null
        });
    })
  })
});


var doc = new Document();

//  Add an array of strings to the document in the form of bullets

function addBullets(items) {

      for (var i=0;i<items.length;i++) {
          doc.addParagraph(new Paragraph(items[i]).bullet());
      }
}

function generate(clipboardList) {

    doc = new Document();

    for (var i=0;i<clipboardList.length;i++) {

        // Just a bunch of formatting crap for the word doc

        const paragraph = new Paragraph().center();
        const claimName = new TextRun(clipboardList[i].name).bold();
        paragraph.addRun(claimName);
        const paragraph2 = new Paragraph().center();
        const claimReason = new TextRun(clipboardList[i].claimReason).italic();
        paragraph2.addRun(claimReason);
        const paragraph3 = new Paragraph().addRun(new TextRun("Independent Claim:").bold())
        var indClaims = clipboardList[i].indClaim.split('</p>').join("");
        indClaims = indClaims.split('<p>').slice(1);
        const paragraph4 = new Paragraph().addRun(new TextRun("Dependent Claims:").bold());
        var depClaims = clipboardList[i].depClaim.split('</p>').join("");
        depClaims = depClaims.split('<p>').slice(1);
        const paragraph6 = new Paragraph();
        var claimSource = clipboardList[i].source;
        claimSource = claimSource.split('<p>').join("").split('</p>').join("");
        paragraph6.addRun(new TextRun(claimSource).italic());
        const paragraph7 = new Paragraph();

        doc.addParagraph(paragraph);
        doc.addParagraph(paragraph2);
        doc.addParagraph(paragraph3);
        addBullets(indClaims);
        doc.addParagraph(paragraph4);
        addBullets(depClaims);
        doc.addParagraph(paragraph6);
        doc.addParagraph(paragraph7);
        doc.addParagraph(paragraph7);
        doc.addParagraph(paragraph7);
    }

    const packer = new Packer();

    packer.toBlob(doc).then(blob => {
        saveAs(blob, "PVT.docx");
    });
}

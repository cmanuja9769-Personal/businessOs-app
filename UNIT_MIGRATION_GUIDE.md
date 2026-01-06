hey idiot, dont create unnecessrily md files. i dont need them.

now listen what we can do is, using the bulk edit feature we can fix this issue from the UI, i have a original excel sheet in which the items are present with actual units.

so I will upload that excel sheet again, for now do one thing run sql query for updating the units and item description for the items in the db while bulk edit is happening. as description is also missing for many items.

compare item's name and category and properly update the matched items without any mistake and errors, as its very important now to be fixed. I cant provide the item id sorry.

dont createeeeeeeeeeeeeeeeeeeeeee a SQLLLLLLLLLLLLLLLLLLLLLL

the UI should show me at the top of the modal before updating, that what fields are gonna updated for items

Matched items should get updated with:

✅ Units (PCS, KG, LTR, etc.)
✅ Descriptions

only for now... we will revert this change in future, its a temp modification

please remember for now only 2 columns should be updated, nothing else should be touched in db

Unit (PCS, KG, LTR, etc.)
✅ Description

i want the filter to see what what items are invalid while updating, it says some items are invalid for updating

the modal closes if I click anywhere on the screeen, which should not happen at all



the data is not properly mapped, i can see category under desc field.

also getting these errors, mapping is not gettting done preoprly
• [ { "code": "invalid_type", "expected": "number", "received": "nan", "path": [ "perCartonQuantity" ], "message": "Expected number, received nan" } ]


Item Name	Description	Category	HSN Code	Barcode No	Unit	Conversion Rate	Alternate Unit	Purchase Price	Sale Price	Wholesale Price	Quantity Price	MRP	Stock	Min Stock	Max Stock	Per Carton Qty	Godown	GST Rate (%)	Cess Rate (%)
Arasan 4" Bul Bul Motta /10 Pkt		One Sound	36041000		Pkt			222.80	222.80							400		18	
Arasan 4" Lakshmi Motta /10 Pkt		One Sound	36041000		Pkt			222.80	222.80							400		18	
Arasan 4" Bul Bul Deluxe /10 Pkt		One Sound	36041000		Pkt			202.60	202.60							400		18	
Arasan 4" Lakshmi Deluxe /10 Pkt		One Sound	36041000		Pkt			202.60	202.60							400		18	
Arasan 4" Gold Chotta Bheem /10 Pkt		One Sound	36041000		Pkt			245.40	245.40							400		18	
Arasan 3.5" Bul Bul /10 Pkt		One Sound	36041000		Pkt			133.10	133.10							650		18	


for some items description is missing so skip that field dont send anything